# directory-thumbnailer

Script that creates thumbnails of images in a directory with the help of node-canvas.

## Setup
```sh
npm install
```

## How to use
```sh
node index.js [options] <directory>

# Example
node index.js "C:/Users/Me/Pictures"
# It will create a Pictures.png file in your working directory
```

## Options

- `-c`, `--columns`, `--col` sets the maximum number of columns in the result, default is `5`
- `-p`, `--padding` sets the size in pixels of the padding between the thumbnails, default is `5`
- `-s`, `--size` sets the size in pixels of the thumbnails, default is `128`
- `-o`, `--out` sets the output file, default is the directory name + .png
- `--background`, `--bg` sets the background color of the output, default is `white`
- `--text-color`, `--color` sets the text color, default is `black`
- `--shadow-color`, `--shadow` sets the color of the shadow, default is `rgba(0, 0, 0, 0.5)`