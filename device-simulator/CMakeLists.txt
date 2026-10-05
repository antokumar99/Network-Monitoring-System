cmake_minimum_required(VERSION 3.10)
project(device_simulator LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE Release)
endif()

find_package(Threads REQUIRED)

add_executable(device-simulator
  src/main.cpp
  src/Device.cpp
  src/Metrics.cpp
  src/TcpServer.cpp
)

target_include_directories(device-simulator PRIVATE include)
target_link_libraries(device-simulator PRIVATE Threads::Threads)

if(WIN32)
  target_link_libraries(device-simulator PRIVATE ws2_32)
endif()

if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
  target_compile_options(device-simulator PRIVATE -Wall -Wextra)
endif()
