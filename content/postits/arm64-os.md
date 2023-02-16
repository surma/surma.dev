---json
{
  "title": "Writing Arm64",
  "date": "2023-01-15",
  "socialmediaimage2": "social.png",
  "live": false
}

---

- More on dynamic/static linking: https://michaelspangler.io/posts/statically-linking-on-macos.html
- Hello Silicon: https://github.com/below/HelloSilicon
- Linking on MacOS without libSystem: https://stackoverflow.com/questions/32453849/minimal-mach-o-64-binary/32659692#32659692
- Install `aarch64-elf-binutils`
- Serial port: https://github.com/qemu/qemu/blob/f670b3eec7f5d1ed8c4573ef244e7b8c6b32001b/hw/arm/versatilepb.c#L285
- PL011 serial port: https://developer.arm.com/documentation/ddi0183/f
- Cortex-A35: https://developer.arm.com/Processors/Cortex-A35
- virt qemu board: https://qemu.readthedocs.io/en/latest/system/arm/virt.html
- Device Tree specification: https://github.com/devicetree-org/devicetree-specification/
```
.global _reset
_reset:
	mov X13, #0x1337
start:
	B start
```

```

ENTRY(_reset)
SECTIONS {
 . = 0x10000;
 .text : { *(.text) }
 . = ALIGN(8);
 . = . + 0x1000; /* 4kB of stack memory */
 stack_top = .;
}

```

```
.PHONEY: all

PREFIX=aarch64-elf-

all: kernel.bin

.PRECIOUS: %.elf
%.bin: %.elf
	$(PREFIX)objcopy -O binary $< $@

%.elf: %.o linker.ld
	$(PREFIX)ld -T linker.ld -o $@ $<

%.o: %.s
	$(PREFIX)as -o $@ $<

```

```
qemu-system-aarch64 -M virt -cpu cortex-a35  -m 128M -nographic -kernel kernel.bin
```
- ctrl+a c 
- info registers x13 = 1337, x0 => dtb address

## DTB & serial ports

- pmemsave 0x4400000 y0 1048576 memdump.dtb
- dtc memdump.dtb
- `brew install dts` `dtc -O dts memdump`

```
/dts-v1/;

/ {
        interrupt-parent = <0x8002>;
        model = "linux,dummy-virt";
        #size-cells = <0x02>;
        #address-cells = <0x02>;
        compatible = "linux,dummy-virt";
        ...
        pl011@9000000 {
                clock-names = "uartclk\0apb_pclk";
                clocks = <0x8000 0x8000>;
                interrupts = <0x00 0x01 0x04>;
                reg = <0x00 0x9000000 0x00 0x1000>;
                compatible = "arm,pl011\0arm,primecell";
        };
        ...
};
```

- qemu ... -s S
- lldb ./kernel.elf
- gdb-remote localhost:1234
- Execution starts at 0x4000_0000 (RAM!)
- Kernel is loaded to 0x4008_0000 (where are the docs for this??!)

## Position independent
- Trying to copy my kernel to 0x4000_0000_0000_1000 causes exception (jump to 0x200)


## Rust

- `rustc --target=aarch64-unknown-none main.rs `

```rust

#![no_std]
#[no_mangle]
static UART0DR: *const u8 = 0x9000000 as *const u8;

pub extern "C" fn main() {
    unsafe {
        *(UART0DR as *mut u8) = 'H';
    }
}
```

... TBD

## Multicore

- `qemu ... -smp 2 ...`


