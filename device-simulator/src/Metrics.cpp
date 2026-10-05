#include "Metrics.h"

#include <cstdio>
#include <random>

namespace {

std::mt19937& rng() {
    thread_local std::mt19937 gen{std::random_device{}()};
    return gen;
}

double clampValue(double v, double lo, double hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
}

double gaussian(double stddev) {
    std::normal_distribution<double> dist(0.0, stddev);
    return dist(rng());
}

double uniform(double lo, double hi) {
    std::uniform_real_distribution<double> dist(lo, hi);
    return dist(rng());
}

// Mean-reverting random walk: pulls toward `target`, plus gaussian noise.
double step(double current, double target, double noise, double lo, double hi) {
    double next = current + (target - current) * 0.12 + gaussian(noise);
    return clampValue(next, lo, hi);
}

}  // namespace

namespace metrics {

double randomUnit() { return uniform(0.0, 1.0); }

int randomInt(int lo, int hi) {
    std::uniform_int_distribution<int> dist(lo, hi);
    return dist(rng());
}

void update(Metrics& m, const Metrics& base) {
    m.cpu = step(m.cpu, base.cpu, 3.0, 1.0, 100.0);
    m.memory = step(m.memory, base.memory, 1.0, 5.0, 99.0);
    m.bandwidthIn = step(m.bandwidthIn, base.bandwidthIn, base.bandwidthIn * 0.08 + 1.0, 0.0, 10000.0);
    m.bandwidthOut = step(m.bandwidthOut, base.bandwidthOut, base.bandwidthOut * 0.08 + 1.0, 0.0, 10000.0);
    m.latency = step(m.latency, base.latency, 1.5, 0.5, 2000.0);
    m.packetLoss = step(m.packetLoss, base.packetLoss, 0.15, 0.0, 100.0);
    m.temperature = step(m.temperature, base.temperature, 0.6, 20.0, 100.0);

    // Occasional anomalies so the monitoring system has something to alert on.
    if (randomUnit() < 0.006) m.cpu = clampValue(m.cpu + uniform(30.0, 45.0), 1.0, 100.0);
    if (randomUnit() < 0.004) m.latency += uniform(100.0, 250.0);
    if (randomUnit() < 0.003) m.packetLoss += uniform(3.0, 8.0);
    if (randomUnit() < 0.002) m.temperature += uniform(12.0, 20.0);
}

std::string toJson(const Metrics& m) {
    char buf[320];
    std::snprintf(buf, sizeof(buf),
                  "{\"cpu\":%.2f,\"memory\":%.2f,\"bandwidthIn\":%.2f,\"bandwidthOut\":%.2f,"
                  "\"latency\":%.2f,\"packetLoss\":%.2f,\"temperature\":%.2f}",
                  m.cpu, m.memory, m.bandwidthIn, m.bandwidthOut, m.latency, m.packetLoss,
                  m.temperature);
    return std::string(buf);
}

}  // namespace metrics
