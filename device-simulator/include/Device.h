#pragma once

#include <mutex>
#include <string>

#include "Metrics.h"

// A simulated network device. tick() is called once per second by main();
// toJson() is called from client-handler threads, so state is mutex-guarded.
class Device {
public:
    Device(std::string id, std::string type, Metrics baseline);

    const std::string& id() const { return id_; }

    // Advance the simulation by one step (may randomly take the device offline).
    void tick();

    // Force the device offline / back online (used by the DOWN / UP commands).
    void setForcedDown(bool down);

    // {"id":"R1","type":"router","status":"online","metrics":{...},"timestamp":123}
    // When offline, "metrics" is null.
    std::string toJson() const;

private:
    std::string id_;
    std::string type_;
    Metrics baseline_;
    Metrics current_;
    bool online_ = true;
    bool forcedDown_ = false;
    int downTicks_ = 0;
    mutable std::mutex mutex_;
};
