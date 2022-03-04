function fatal(msg) {
  document.body.innerHTML = `<pre>${msg}</pre>`;
  throw Error(msg);
}

if (!("gpu" in navigator)) fatal("WebGPU not supported. Please enable it in about:flags in Chrome or in about:config in Firefox.");

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) fatal("Couldn’t request WebGPU adapter.");

const device = await adapter.requestDevice();
if (!device) fatal("Couldn’t request WebGPU device.");

const module = device.createShaderModule({
  code: `
    @group(0) @binding(1)
    var<storage, write> output: array<f32>;

    @stage(compute) @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>,
      @builtin(local_invocation_id)
      local_id : vec3<u32>,
    ) {
      // if(global_id.x > arrayLength(&output)) {
      //   return;
      // }
      output[global_id.x] = f32(global_id.x) * 1000. + f32(local_id.x);
    }
  `,
});

const bindGroupLayout = device.createBindGroupLayout({
  entries: [
    {
      binding: 1,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {
        type: "storage",
      },
    },
  ],
});

const pipeline = device.createComputePipeline({
  layout: device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  }),
  compute: {
    module,
    entryPoint: "main",
  },
});

const BUFFER_SIZE = 1000;

const output = device.createBuffer({
  size: BUFFER_SIZE,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
});

const stagingBuffer = device.createBuffer({
  size: BUFFER_SIZE,
  usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
});

const bindGroup = device.createBindGroup({
  layout: bindGroupLayout,
  entries: [
    {
      binding: 1,
      resource: {
        buffer: output,
      },
    },
  ],
});

const commandEncoder = device.createCommandEncoder();
const passEncoder = commandEncoder.beginComputePass();
passEncoder.setPipeline(pipeline);
passEncoder.setBindGroup(0, bindGroup);
passEncoder.dispatch(Math.ceil(BUFFER_SIZE / 64));
passEncoder.end();
commandEncoder.copyBufferToBuffer(output, 0, stagingBuffer, 0, BUFFER_SIZE);
const commands = commandEncoder.finish();
device.queue.submit([commands]);

await stagingBuffer.mapAsync(GPUMapMode.READ, 0, BUFFER_SIZE);
const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE);
const data = copyArrayBuffer.slice();
stagingBuffer.unmap();
console.log(new Float32Array(data));
