---json
{
  "title": "Writing and debugging bare metal arm64",
  "date": "2023-02-21",
  "socialmediaimage2": "social.png",
  "tags": ["postits"],
  "live": false
}

---

I learned a bit of arm64 (aarch64) and of course had to write it on the bare metal.

<!-- more -->

I wanted to understand the machine code WebAssembly runtimes like [v8] or [wasmtime] emit on my MacBook Air M1, and for that learned arm64 assembly (a bit). My colleague [Saúl Cabrera][saul] recommended "Programming with 64-Bit ARM Assembly Language" by Stephen Smith, and I can only echo that recommendation.


<figure>
	<picture>
		<source type="image/avif" srcset="./book.avif">
  <img loading="lazy" width="676" height="1024" style="max-height: 512px" src="./book.jpg">
	</picture>
  <figcaption>"Programming with 64-Bit ARM Assembly Language" by Stephen Smith, APress 2020</figcaption>
</figure>

The book does a great job of teaching the comparatively small instruction set, the optimization tricks as well as conventions and ABIs. However, it only makes you write programs against an operating system, not against a bare metal processor like you could do on a Rasperry Pi or similar. So that's what I wanted to do.

## Qemu

Because real hardware is annoyingly hard to bootstrap and debug, I am scoping this to a completely virtual platform. [Qemu] is my emulator of choice here as it can emulate a wide variety of processor architectures on a many different boards. For this, I'll use the [`virt`][virt] system that, while it is completely imaginary, is sufficiently well documented. For the CPU I'll use an Cortex-A72, mostly because that's the CPU that's in the [Rasperry Pi 400], which I eventually want to program this way.

### Test program

 Without an operating system, you can't rely on good old `printf` debugging. There is nothing there that writes characters to the screen for you. Instead, we'll use the built-in capabilities that qemu offers to verify that our programs are working. At least intially.

Here's a minimal program that puts a specific value into one of the CPU's register and then loops forever. 

```armasm
.global _reset
_reset:
	mov X13, #0x1337
	# Loop endlessly
	B . 
```

If you are on an M1 like me, you could use the system-provided `as` to turn this into machine code. But the [binutils] that MacOS provides have been changed and are not as powerful as the GNU variants, so I recommend installing `aarch64-elf-binutils` via homebrew or building them yourself (although it's a bit tedious because of a bunch of dependencies I had to discover incrementally:

```
$ ./configure --prefix=<PREFIX> --disable-gdb --target=aarch64-elf-linux
$ make
$ make install
# ... all tools will be in $PREFIX/bin
```
 
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
 . = 0x400000000;
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
#![no_main]

fn send_uart(c: u8) {
    const UART0DR: *const u8 = 0x9000000 as *const u8;
    unsafe {
        *(UART0DR as *mut u8) = c;
    }
}

#[no_mangle]
pub extern "C" fn mymain() {
    send_uart('H' as u8);
}

#[panic_handler]
unsafe fn panic_handler(_: &core::panic::PanicInfo) -> ! {
    loop {}
}
```

- `rustc --emit=obj --target=aarch64-unknown-none main.rs`

```
start:
	LDR X10, =mymain
	BLR X10
spinlock:
	B spinlock
```

### more

```rust

const UART0DR: *mut u8 = 0x9000000 as *mut u8;
fn send_uart(str: &str) {
    for c in str.chars() {
        let as_byte: u8 = c.try_into().unwrap_or('?' as u8);
        unsafe {
            *UART0DR = as_byte;
        }
    }
}

#[no_mangle]
pub extern "C" fn mymain() {
    send_uart("Hello world!😭\n");
}
```

## Multicore

- `qemu ... -smp 2 ...`

[wasmtime]: https://wasmtime.dev/
[v8]: https://v8.dev
[saul]: https://twitter.com/saulecabrera
[qemu]: https://www.qemu.org/
[virt]: https://qemu.readthedocs.io/en/latest/system/arm/virt.html
[linker scripts]: https://sourceware.org/binutils/docs/ld/Scripts.html#Scripts
[binutils]: https://www.gnu.org/software/binutils/
[rasperry pi 400]: https://www.raspberrypi.com/products/raspberry-pi-400/
