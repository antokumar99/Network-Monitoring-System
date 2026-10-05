#include "TcpServer.h"

#include <algorithm>
#include <cctype>
#include <chrono>
#include <cstring>
#include <iostream>
#include <sstream>
#include <thread>
#include <utility>

#ifndef _WIN32
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>
#endif

namespace {

void closeSocket(socket_t s) {
#ifdef _WIN32
    closesocket(s);
#else
    ::close(s);
#endif
}

bool sendAll(socket_t fd, const std::string& data) {
    size_t sent = 0;
    while (sent < data.size()) {
        const int n = ::send(fd, data.data() + sent, static_cast<int>(data.size() - sent), 0);
        if (n <= 0) return false;
        sent += static_cast<size_t>(n);
    }
    return true;
}

std::string upper(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(),
                   [](unsigned char c) { return static_cast<char>(std::toupper(c)); });
    return s;
}

}  // namespace

TcpServer::TcpServer(std::string host, int port, std::vector<std::shared_ptr<Device>> devices)
    : host_(std::move(host)), port_(port), devices_(std::move(devices)) {}

TcpServer::~TcpServer() {
    stop();
#ifdef _WIN32
    WSACleanup();
#endif
}

bool TcpServer::start() {
#ifdef _WIN32
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        std::cerr << "WSAStartup failed\n";
        return false;
    }
#endif

    listenFd_ = ::socket(AF_INET, SOCK_STREAM, 0);
    if (listenFd_ == kInvalidSocket) {
        std::cerr << "Failed to create socket\n";
        return false;
    }

#ifndef _WIN32
    int opt = 1;
    setsockopt(listenFd_, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&opt), sizeof(opt));
#endif

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(static_cast<unsigned short>(port_));
    if (inet_pton(AF_INET, host_.c_str(), &addr.sin_addr) != 1) {
        std::cerr << "Invalid host address: " << host_ << "\n";
        return false;
    }

    if (::bind(listenFd_, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) != 0) {
        std::cerr << "bind() failed on " << host_ << ":" << port_ << " (port already in use?)\n";
        return false;
    }
    if (::listen(listenFd_, 16) != 0) {
        std::cerr << "listen() failed\n";
        return false;
    }

    running_ = true;
    return true;
}

void TcpServer::run() {
    while (running_) {
        sockaddr_in client{};
#ifdef _WIN32
        int len = sizeof(client);
#else
        socklen_t len = sizeof(client);
#endif
        const socket_t fd = ::accept(listenFd_, reinterpret_cast<sockaddr*>(&client), &len);
        if (fd == kInvalidSocket) {
            if (!running_) break;
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
            continue;
        }
        std::thread(&TcpServer::handleClient, this, fd).detach();
    }
}

void TcpServer::stop() {
    if (!running_.exchange(false)) return;
#ifdef _WIN32
    closesocket(listenFd_);
#else
    ::shutdown(listenFd_, SHUT_RDWR);  // unblocks accept() in run()
    ::close(listenFd_);
#endif
}

void TcpServer::handleClient(socket_t fd) {
    std::string buffer;
    char chunk[1024];
    bool open = true;

    while (open && running_) {
        const int n = ::recv(fd, chunk, sizeof(chunk), 0);
        if (n <= 0) break;
        buffer.append(chunk, static_cast<size_t>(n));

        size_t pos;
        while ((pos = buffer.find('\n')) != std::string::npos) {
            std::string line = buffer.substr(0, pos);
            buffer.erase(0, pos + 1);
            if (!line.empty() && line.back() == '\r') line.pop_back();
            if (line.empty()) continue;

            if (upper(line) == "QUIT") {
                open = false;
                break;
            }
            if (!sendAll(fd, handleCommand(line) + "\n")) {
                open = false;
                break;
            }
        }
        if (buffer.size() > 4096) break;  // protect against garbage input
    }
    closeSocket(fd);
}

std::shared_ptr<Device> TcpServer::find(const std::string& id) const {
    for (const auto& d : devices_) {
        if (d->id() == id) return d;
    }
    return nullptr;
}

std::string TcpServer::handleCommand(const std::string& line) const {
    std::istringstream in(line);
    std::string cmd, arg;
    in >> cmd >> arg;
    cmd = upper(cmd);

    if (cmd == "PING") return "PONG";

    if (cmd == "LIST") {
        std::string out = "{\"devices\":[";
        for (size_t i = 0; i < devices_.size(); ++i) {
            if (i) out += ",";
            out += "\"" + devices_[i]->id() + "\"";
        }
        return out + "]}";
    }

    if (cmd == "ALL") {
        std::string out = "{\"devices\":[";
        for (size_t i = 0; i < devices_.size(); ++i) {
            if (i) out += ",";
            out += devices_[i]->toJson();
        }
        return out + "]}";
    }

    if (cmd == "GET" || cmd == "DOWN" || cmd == "UP") {
        if (arg.empty()) return "{\"error\":\"missing device id\"}";
        const auto device = find(arg);
        if (!device) return "{\"error\":\"unknown device\"}";
        if (cmd == "GET") return device->toJson();
        device->setForcedDown(cmd == "DOWN");
        return "{\"ok\":true}";
    }

    return "{\"error\":\"unknown command\"}";
}
