#!/usr/bin/env gorun

package main

import "http"

func main() {
	http.ListenAndServe(":8000", http.FileServer(http.Dir(".")))
}
