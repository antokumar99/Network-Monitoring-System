#pragma once

#include <atomic>
#include <memory>
#include <string>
#include <vector>

#include "Device.h"

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
using socket_t = SOCKET;
constexpr socket_t kInvalidSocket = INVALID_SOCKET;
#else
using socket_t = int;
constexpr socket_t kInvalidSocket = -1;
#endif

// Line-based TCP server. Each request is one line, each reply is one line.
//
//   PING          -> PONG
//   LIST          -> {"devices":["R1","R2",...]}
//   GET <id>      -> {"id":"R1","type":"router","status":"online","metrics":{...},"timestamp":...}
//   ALL           -> {"devices":[ {...}, {...} ]}
//   DOWN <id>     -> {"ok":true}     force a device offline (for demos)
//   UP <id>       -> {"ok":true}     bring it back
//   QUIT          -> closes the connection
class TcpServer {
public:
    TcpServer(std::string host, int port, std::vector<std::shared_ptr<Device>> devices);
    ~TcpServer();

    bool start();  // create socket, bind, listen
    void run();    // accept loop (blocks until stop())
    void stop();   // safe to call from a signal handler

private:
    void handleClient(socket_t fd);
    std::string handleCommand(const std::string& line) const;
    std::shared_ptr<Device> find(const std::string& id) const;

    std::string host_;
    int port_;
    std::vector<std::shared_ptr<Device>> devices_;
    std::atomic<bool> running_{false};
    socket_t listenFd_ = kInvalidSocket;
};
