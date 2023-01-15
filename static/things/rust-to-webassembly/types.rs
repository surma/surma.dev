
static DATA: [u8; 10] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
#[no_mangle]
pub fn slice() -> &'static [u8] {
    &DATA[1..4]
}

static NAME: &str = "hello";
#[no_mangle]
pub fn string() -> &'static str {
    &NAME
}

pub struct MyStruct {
    a: u32,
    b: u32,
    c: u8,
}
static STRUCT: MyStruct = MyStruct { a: 1, b: 2, c: 3 };
#[no_mangle]
pub fn a_struct() -> &'static MyStruct {
    &STRUCT
}

#[no_mangle]
pub fn a_small_tuple(x: (u8, u8)) -> (u8, u8) {
    (x.0 + 1, x.1 + 2)
}

#[no_mangle]
pub fn a_big_tuple(x: (u32, u32, u32)) -> (u32, u32, u32) {
    (x.0 + 1, x.1 + 2, x.2 + 3)
}

#[no_mangle]
pub fn big_array() -> [u8; 10] {
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
}

#[no_mangle]
pub fn small_array() -> [u8; 2] {
    [1, 2]
}
