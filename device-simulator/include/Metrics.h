#pragma once

#include <string>

// One snapshot of a device's health.
// bandwidth in Mbps, latency in ms, packetLoss in %, temperature in Celsius.
struct Metrics {
    double cpu = 20;
    double memory = 40;
    double bandwidthIn = 100;
    double bandwidthOut = 60;
    double latency = 10;
    double packetLoss = 0.1;
    double temperature = 45;
};

namespace metrics {

// Move `current` one step toward `base` with random noise, plus rare
// anomalies (CPU spikes, latency spikes, ...) so alerts actually fire.
void update(Metrics& current, const Metrics& base);

// Serialize to a JSON object string: {"cpu":..,"memory":..,...}
std::string toJson(const Metrics& m);

// Small helpers shared with Device (thread-local RNG).
double randomUnit();              // uniform in [0, 1)
int randomInt(int lo, int hi);    // uniform in [lo, hi]

}  // namespace metrics
