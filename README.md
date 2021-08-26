# binary-install-raw

Install raw binary applications via npm

## Usage

This library provides a single class `Binary` that takes the name of your binary, and download url with an optional tag argument.

```js
let binary = new Binary("my-binary", "https://example.com/binary", "0.0.1")
```

After your `Binary` has been created, you can run `.install()` to install the binary, and `.run()` to run it.

