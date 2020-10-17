const fs = require('fs')
const path = require('path')
const canvas = require('canvas')
require('yargs')
    .option('columns', {
        alias: ['col', 'c'],
        type: 'number',
        default: 5,
        description: 'number of maximum columns'
    })
    .option('size', {
        alias: ['s'],
        type: 'number',
        default: 128,
        description: 'size of thumbnails'
    })
    .option('padding', {
        alias: ['p'],
        type: 'number',
        default: 5,
        description: 'size of padding between thumbnails'
    })
    .command('$0 <dir>', 'create thumbnails collage of a directory', () => {}, async (args) => {
        try {
            await generateThumbnail(args.dir, args.columns, args.size, args.padding)
        } catch (e) {
            console.error(e)
        }
    })
    .help().argv

async function generateThumbnail(directory, columns, thumbnailSize, padding) {
    const files = await new Promise((resolve, reject) => {
        fs.readdir(directory, async (err, files) => {
            if (err) {
                reject(err)
                return
            }
            resolve(files)
        })
    })
    if (files.length === 0) {
        throw new Error('Directory is empty')
    }
    const unknownImage = await canvas.loadImage(path.join(__dirname, 'unknown.png'))
    const collageSize = {
        width: (thumbnailSize + padding * 2) * Math.min(columns, files.length),
        height: (thumbnailSize + padding * 2) * Math.ceil(files.length / columns)
    }
    const collageCanvas = canvas.createCanvas(collageSize.width, collageSize.height)
    const ctx = collageCanvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, collageSize.width, collageSize.height)
    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        console.log(file)
        let image = null
        try {
            image = await canvas.loadImage(path.join(directory, file))
        } catch (e) {
            image = unknownImage
        }
        const scaleRatio = Math.min(thumbnailSize / image.naturalWidth, thumbnailSize / image.naturalHeight)
        const scaledWidth = image.naturalWidth * scaleRatio
        const scaledHeight = image.naturalHeight * scaleRatio
        const column = i % columns
        const row = Math.trunc(i / columns)
        ctx.shadowBlur = 2
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        ctx.drawImage(image,
            column * (padding * 2 + thumbnailSize) + padding + (thumbnailSize * .5 - scaledWidth * .5),
            row * (padding * 2 + thumbnailSize) + padding + (thumbnailSize * .5 - scaledHeight * .5),
            scaledWidth,
            scaledHeight
        )
        ctx.shadowBlur = 0
        ctx.shadowColor = 'rgba(0, 0, 0, 0)'
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        ctx.font = 'bold 12px sans-serif'
        ctx.lineWidth = 2
        const textPosition = {
            x: column * (padding * 2 + thumbnailSize) + padding,
            y: row * (padding * 2 + thumbnailSize) + padding + 12
        }
        ctx.strokeStyle = 'black'
        ctx.strokeText(file, textPosition.x, textPosition.y, thumbnailSize)
        ctx.fillStyle = 'white'
        ctx.fillText(file, textPosition.x, textPosition.y, thumbnailSize)
    }
    await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(`${path.basename(directory)}.png`)
        const stream = collageCanvas.createPNGStream()
        stream.pipe(out)
        out.on('error', (err) => reject(err))
        out.on('finish', () => resolve())
    })
}