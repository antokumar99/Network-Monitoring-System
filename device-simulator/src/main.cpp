#include <atomic>
#include <chrono>
#include <csignal>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <string>
#include <thread>
#include <vector>

#include "Device.h"
#include "Metrics.h"
#include "TcpServer.h"

namespace {

std::atomic<bool> g_running{true};
TcpServer* g_server = nullptr;

void onSignal(int) {
    g_running = false;
    if (g_server) g_server->stop();
}

std::vector<std::shared_ptr<Device>> createDevices() {
    // Metrics{cpu, memory, bandwidthIn, bandwidthOut, latency, packetLoss, temperature}
    // IDs must match the sim_id column in database/seed.sql.
    std::vector<std::shared_ptr<Device>> devices;
    devices.push_back(std::make_shared<Device>("R1", "router", Metrics{35, 48, 420, 310, 6, 0.05, 52}));
    devices.push_back(std::make_shared<Device>("R2", "router", Metrics{28, 44, 260, 180, 9, 0.10, 49}));
    devices.push_back(std::make_shared<Device>("SW1", "switch", Metrics{22, 38, 640, 590, 2, 0.02, 44}));
    devices.push_back(std::make_shared<Device>("SW2", "switch", Metrics{18, 35, 310, 270, 3, 0.03, 42}));
    devices.push_back(std::make_shared<Device>("FW1", "firewall", Metrics{45, 58, 380, 360, 12, 0.08, 56}));
    devices.push_back(std::make_shared<Device>("SRV1", "server", Metrics{52, 66, 220, 540, 15, 0.05, 58}));
    devices.push_back(std::make_shared<Device>("SRV2", "server", Metrics{60, 74, 120, 90, 18, 0.04, 61}));
    devices.push_back(std::make_shared<Device>("AP1", "access_point", Metrics{30, 41, 95, 70, 22, 0.40, 46}));
    return devices;
}

}  // namespace

int main(int argc, char* argv[]) {
    std::string host = "127.0.0.1";
    int port = 9000;

    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        if (arg == "--port" && i + 1 < argc) {
            port = std::atoi(argv[++i]);
        } else if (arg == "--host" && i + 1 < argc) {
            host = argv[++i];
        } else {
            std::cout << "Usage: device-simulator [--host 127.0.0.1] [--port 9000]\n";
            return arg == "--help" ? 0 : 1;
        }
    }

#ifndef _WIN32
    std::signal(SIGPIPE, SIG_IGN);  // a client hanging up must not kill the server
#endif
    std::signal(SIGINT, onSignal);
    std::signal(SIGTERM, onSignal);

    auto devices = createDevices();
    TcpServer server(host, port, devices);
    g_server = &server;

    if (!server.start()) return 1;

    std::cout << "Device simulator listening on " << host << ":" << port << " with "
              << devices.size() << " devices:";
    for (const auto& d : devices) std::cout << " " << d->id();
    std::cout << "\nCommands: PING | LIST | ALL | GET <id> | DOWN <id> | UP <id> | QUIT\n"
              << "Press Ctrl+C to stop.\n";

    // Background thread: advance the simulation once per second.
    std::thread ticker([&devices]() {
        while (g_running) {
            for (const auto& d : devices) d->tick();
            for (int i = 0; i < 10 && g_running; ++i) {
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
            }
        }
    });

    server.run();  // blocks until Ctrl+C

    g_running = false;
    ticker.join();
    std::cout << "\nSimulator stopped.\n";
    return 0;
}
