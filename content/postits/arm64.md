---json
{
  "title": "Writing and debugging bare metal arm64",
  "date": "2023-02-22",
  "socialmediaimage": "social.jpg",
  "tags": ["postits"],
  "live": true
}

---

I learned a bit of arm64 (aarch64) and wanted to write it for the bare metal.

<!-- more -->

I wanted to understand, analyze and scrutinize the machine code WebAssembly runtimes like [v8] or [wasmtime] emit on my MacBook Air M1. To that end I learned arm64 assembly (...a bit). My colleague [Saúl Cabrera][saul] recommended "Programming with 64-Bit ARM Assembly Language" by Stephen Smith, and I can only echo that recommendation.


<figure>
	<picture>
		<source type="image/avif" srcset="./book.avif">
  <img loading="lazy" width="676" height="1024" style="max-height: 512px" src="./book.jpg">
	</picture>
  <figcaption>"Programming with 64-Bit ARM Assembly Language" by Stephen Smith, APress 2020</figcaption>
</figure>

The book does a great job of teaching the instruction set, the optimization tricks as well as conventions and ABIs. However, it only makes you write programs against an operating system. I'd love to bootstrap my own BBC Microbit or Rasperry Pi. This PostIt documents my first couple steps in that direction.

## Qemu

Because real hardware is annoyingly hard to bootstrap and debug, I am scoping this to a completely virtual platform. [Qemu] is my emulator of choice here as it can emulate a wide variety of processor architectures on a many different boards. For this, I'll use the [`virt`][virt] system that, while it is completely imaginary, is sufficiently well documented. For the CPU I'll use an Cortex-A72, mostly because that's the CPU that's in the [Rasperry Pi 400], which I eventually want to program this way.

The most important parts from the documentation are at the very end of the page:
* Flash memory starts at address `0x0000_0000`
* RAM starts at `0x4000_0000`
* The DTB (more on that later) is at the start of RAM, i.e. `0x4000_0000`

We will configure or instance to have 128MiB of RAM, so our usable memory address range will go from `0x4000_0000` to `0x4800_0000`.

### Test program

 Without an operating system, you can't use good old `printf` debugging. There is nothing turns your string into pixels on the screen _for you_, we'd have to do that ourselves. That's a lot of work, so instead, we'll use the built-in capabilities that qemu offers to verify that our setup is working.

To assemble our assembly code to binary machine code, we will use `as`. If you are on an M1 like me, you could use the system-provided `as`. However, the [binutils] that MacOS provides are only GNU-_like_, and have been changed to enforce certain constraints and assumptions specific to Apple M1 processors and MacOS.  I recommend installing `aarch64-elf-binutils` via homebrew or building binutils yourself (although it's a bit tedious because I only discovered all dependencies incrementally through compilation errors):

```
$ ./configure --prefix=<PREFIX> --disable-gdb --target=aarch64-elf-linux
$ make
$ make install
# ... all tools will be in $PREFIX/bin
```

As a minimal test that our setup is working, let's put a special value into one of the CPU's register and then loop forever afterwards.

```armasm
# main.s

.global _reset
_reset:
	# Set up stack pointer
	LDR X2, =stack_top
	MOV SP, X2
	# Magic number
	MOV X13, #0x1337
	# Loop endlessly
	B . 
```

We can turn this into an object files as follows:

```
$ as -o main.o main.s
```

In the next step we need to link our object file into the final machine code using `ld`. By default, `ld` is configured to create an executable as the operating system it has been told to target expects. This configuration is done via a so-called linker script. You can look at the default linker script by running `ld --verbose`. But since we don't have an operating system, we'll have to write our own. Linker scripts are very weird in my opinion, and I haven't fully understood them still, despite finding the [documentation][linker scripts].

The following linker script will adjust our machine code, so that it expects to be loaded at `0x4010_0000`, which I chose to be 1MiB after the ominous DTB.  It also defines the `stack_top` symbol to point to an adress 4KiB after our code, which means we have 4KiB of stack space. We won't be using the stack, but it's always good to set it up so that something as basic as a function call works correctly.

```
/* linker.ld */
SECTIONS {
	. = 0x40100000;
	.text : { *(.text) }
	. = ALIGN(8);
	. = . + 0x1000; 
	stack_top = .;
}
```

Let's link our code:

```
$ ld -T linker.ld -o main.elf main.o
```

We can use `objdump` to inspect that the addresses and instructions have been linked correctly:

```
$ objdump -d kernel.elf

main.elf:     file format elf64-littleaarch64

Disassembly of section .text:

0000000040100000 <_reset>:
    40100000:   d28266ed        mov     x13, #0x1337                    // #4919
    40100004:   14000000        b       40100004 <_reset+0x4>
```

We have an [ELF] file, but again, we are running bare metal, where there is no operating system that can decode the ELF file format and load the instruction into the right spot in memory. We have to extract the raw binary instructions ahead of time and `objcopy` comes in handy for that task:

```
$ objcopy -O binary main.elf main.bin
```

Instead of dealing with BIOSes, boot sectors or other shenanigans, we'll use Qemu's [generic loader] functionality to load that file into memory:

```
$ qemu-system-aarch64 \
	-M virt -cpu cortex-a72 \
	-m 128M -nographic \
	-device loader,file=kernel.bin,addr=0x40100000 \
	-device loader,addr=0x40100000,cpu-num=0
```

The first `-device` directive loads a file into memory at the specific address. The second `-device` directive sets the CPUs starting address.

Of course, there won't be any output. Instead, we can open Qemu's console using `Ctrl-a c` and use the `info registers` command to dump the current contents of the CPU registers.

```
QEMU 7.2.0 monitor - type 'help' for more information
(qemu) info registers

CPU#0
 PC=0000000040100004 X00=0000000000000000 X01=0000000000000000
X02=0000000000000000 X03=0000000000000000 X04=0000000000000000
X05=0000000000000000 X06=0000000000000000 X07=0000000000000000
X08=0000000000000000 X09=0000000000000000 X10=0000000000000000
X11=0000000000000000 X12=0000000000000000 X13=0000000000001337
X14=0000000000000000 X15=0000000000000000 X16=0000000000000000
X17=0000000000000000 X18=0000000000000000 X19=0000000000000000
X20=0000000000000000 X21=0000000000000000 X22=0000000000000000
X23=0000000000000000 X24=0000000000000000 X25=0000000000000000
X26=0000000000000000 X27=0000000000000000 X28=0000000000000000
X29=0000000000000000 X30=0000000000000000  SP=0000000000000000
PSTATE=400003c5 -Z-- EL1h    FPU disabled
(qemu) q
```

`X13` contains `0x1337`, so our program is indeed running!

### Touch my 'elf

I lied. While there is no operating system running in our emulated environment to decode ELF files, but Qemu can decode ELF files. The generic loader actually supports ELF files and automatically unpacks and loads the contents into memory as it is prescribed by the ELF file headers! This allows us to simplify the our invocation, but would also allow us to use more complicated linker script setups in the future.

|||codediff|text
  $ qemu-system-aarch64 \
  	-M virt -cpu cortex-a72 \
  	-m 128M -nographic \
- 	-device loader,file=kernel.bin,addr=0x40100000 \
+ 	-device loader,file=kernel.elf \
  	-device loader,addr=0x40100000,cpu-num=0
|||

## Debugging

Putting magic values into registers is not a great way to debug. A much much better way is to use `gdb` step through the system emulated by Qemu, but `gdb` does note support the M1 platform. Luckily, `lldb` understands the gdb remote debugging protocol. We can start Qemu with gdb remote debugging enabled (`-S`), and tell it to start in a pauses state (`-s`).

```
$ qemu-system-aarch64 \
	-M virt -cpu cortex-a72 \
	-m 128M -nographic \
	-device loader,file=kernel.elf \
	-device loader,addr=0x40100000,cpu-num=0 \
	-s -S
```

To connect `lldb` to Qemu, run the following:

```
$ lldb kernel.elf
(lldb) gdb-remote localhost:1234                                                                                                                                      Process 1 stopped
* thread #1, stop reason = signal SIGTRAP
    frame #0: 0x0000000040100000 kernel.elf`_reset
kernel.elf`_reset:
->  0x40100000 <+0>: mov    x13, #0x1337
    0x40100004 <+4>: b      0x40100004                ; <+4>
    0x40100008:      udf    #0x0
    0x4010000c:      udf    #0x0
Target 0: (kernel.elf) stopped.
```

Now we have the full power of a debugger. Stepping, break points, memory and register inspection,... you name it.

## Serial I/O

From the documentation of the `virt` platform, we can see that it comes with a PL011 chip to handle the UART port (also called "serial port"). This seems like the easiest way to have some form of I/O.

Looking at [the manual][pl011] of the PL011, the way to make the chip send a character over UART, is to write a value to a register called `UARTDR`. This register is mapped to memory and can be found at an offset of `0x000` from the PL011's base address — but what is the base address? That changes from system to system and needs to be determined at runtime.

## Device Tree

The [Device Tree] is an open specification for a binary format (Device Tree Blob, or DTB for short) and a text format (Device Tree Syntax, or DTS for short). A device tree describes what periherals a system has and how to access them. The `virt` documentation said that the DTB will be at `0x4000_0000`.

While the correct thing to do would be to write code to parse the DTB, for now we are going to settle with dumping the DTB to disk using `lldb` and extracting the relevant information:

```
(lldb) memory read --force -o dump.dtb -b 0x40000000 0x40000000+1024*1024
```

The dump contains the binary format. By installing `dtc` via homebrew, we can convert between the binary and the text format:

```
$ dtc dump.dtb
/dts-v1/;

/ {
        interrupt-parent = <0x8002>;
        model = "linux,dummy-virt";
        #size-cells = <0x02>;
        #address-cells = <0x02>;
        compatible = "linux,dummy-vi
...
```

There will be a lot of data in there, but most interestingly, there will be this section:

```
pl011@9000000 {
        clock-names = "uartclk\0apb_pclk";
        clocks = <0x8000 0x8000>;
        interrupts = <0x00 0x01 0x04>;
        reg = <0x00 0x9000000 0x00 0x1000>;
        compatible = "arm,pl011\0arm,primecell";
};
```

The base address of the PL011 is `0x900_0000`, which means our `UARTDR` register is also at `0x900_0000`. Let's write something to it:

```armasm
.global _reset
_reset:
	LDR X10, UARTDR
	MOV W9, '!'
	STRB W9, [X10]
	B . 
UARTDR: 
	.quad 0x9000000
```

This writes the ASCII code for `'!'` into `UARTDR`, and Qemu should output it to your shell.

This is where I'll stop for now. I tried to figure out how to start up a multi-core processor (`-smp 4`), but  figure out which processor internal registers need to be manipulated.



[wasmtime]: https://wasmtime.dev/
[v8]: https://v8.dev
[saul]: https://twitter.com/saulecabrera
[qemu]: https://www.qemu.org/
[virt]: https://qemu.readthedocs.io/en/latest/system/arm/virt.html
[linker scripts]: https://sourceware.org/binutils/docs/ld/Scripts.html#Scripts
[binutils]: https://www.gnu.org/software/binutils/
[rasperry pi 400]: https://www.raspberrypi.com/products/raspberry-pi-400/
[generic loader]: https://qemu.readthedocs.io/en/latest/system/generic-loader.html
[elf]: https://en.wikipedia.org/wiki/Executable_and_Linkable_Format
[Device Tree]: https://github.com/devicetree-org/devicetree-specification/
[PL011]: https://developer.arm.com/documentation/ddi0183/f
