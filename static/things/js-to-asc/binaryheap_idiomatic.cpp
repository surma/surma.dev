#include "emscripten.h"
#include "emscripten/bind.h"
#include <cstdint>
#include <optional>
#include <utility>
#include <vector>

using namespace emscripten;

class BinaryHeap {
public:
  BinaryHeap() : data() {}

  void push(float v) {
    this->data.push_back(v);
    this->bubble_up(this->data.size() - 1);
  }

  float peek() { return this->data[0]; }

  float pop() {
    float result = this->data[0];
    float end = this->data.back();
    this->data.pop_back();
    if (this->data.size() > 1) {
      this->data[0] = end;
      this->sink_down(0);
    }
    return result;
  }

  uint32_t size() { return this->data.size(); }

private:
  std::vector<float> data;

  void bubble_up(uint32_t n) {
    float element = this->data[n];
    while (n > 0) {
      uint32_t parent_n =
          static_cast<uint32_t>(floor((static_cast<float>(n) + 1) / 2 - 1));
      float parent = this->data[parent_n];
      if (element < parent) {
        std::swap(this->data[parent_n], this->data[n]);
        n = parent_n;
      } else {
        break;
      }
    }
  }

  void sink_down(uint32_t n) {
    auto length = this->data.size();
    float element = this->data[n];
    while (true) {
      uint32_t child2_n = (n + 1) * 2;
      uint32_t child1_n = child2_n - 1;
      std::optional<uint32_t> swap = {};
      float child1, child2;
      if (child1_n < length) {
        child1 = this->data[child1_n];
        if (child1 < element) {
          swap = std::optional<uint32_t>(child1_n);
        }
      }
      if (child2_n < length) {
        child2 = this->data[child2_n];
        if (child2 < (swap.has_value() ? child1 : element)) {
          swap = std::optional<uint32_t>(child2_n);
        }
      }
      if (swap.has_value()) {
        auto swap_n = swap.value();
        std::swap(this->data[n], this->data[swap_n]);
        n = swap_n;
      } else {
        break;
      }
    }
  }
};

thread_local BinaryHeap instance;

void init() { instance = BinaryHeap(); }

void push(float v) { instance.push(v); }

float pop() { return instance.pop(); }

uint32_t size() { return instance.size(); }

float peek() { return instance.peek(); }

EMSCRIPTEN_BINDINGS(my_module) {
  function("init", &init);
  function("push", &push);
  function("pop", &pop);
  function("size", &size);
  function("peek", &peek);
}