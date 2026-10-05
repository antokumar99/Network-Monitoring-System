#include "Device.h"

#include <chrono>
#include <utility>

Device::Device(std::string id, std::string type, Metrics baseline)
    : id_(std::move(id)), type_(std::move(type)), baseline_(baseline), current_(baseline) {}

void Device::tick() {
    std::lock_guard<std::mutex> lock(mutex_);

    if (forcedDown_) {
        online_ = false;
        return;
    }

    // Randomly recovering from a short outage.
    if (!online_) {
        if (--downTicks_ <= 0) online_ = true;
        return;
    }

    // Small chance of a short random outage (6-15 seconds).
    if (metrics::randomUnit() < 0.004) {
        online_ = false;
        downTicks_ = metrics::randomInt(6, 15);
        return;
    }

    metrics::update(current_, baseline_);
}

void Device::setForcedDown(bool down) {
    std::lock_guard<std::mutex> lock(mutex_);
    forcedDown_ = down;
    online_ = !down;
    downTicks_ = 0;
}

std::string Device::toJson() const {
    std::lock_guard<std::mutex> lock(mutex_);

    const auto now = std::chrono::system_clock::now().time_since_epoch();
    const long long ts = std::chrono::duration_cast<std::chrono::milliseconds>(now).count();

    std::string json = "{\"id\":\"" + id_ + "\",\"type\":\"" + type_ + "\",\"status\":\"";
    json += online_ ? "online" : "offline";
    json += "\",\"metrics\":";
    json += online_ ? metrics::toJson(current_) : std::string("null");
    json += ",\"timestamp\":" + std::to_string(ts) + "}";
    return json;
}
