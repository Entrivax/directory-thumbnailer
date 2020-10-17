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
    .option('out', {
        alias: ['o'],
        type: 'string',
        description: 'output file, defaults to <dir>.png'
    })
    .option('background', {
        alias: ['bg'],
        type: 'string',
        default: 'white',
        description: 'background color'
    })
    .option('text-color', {
        alias: ['color'],
        type: 'string',
        default: 'black',
        description: 'text color'
    })
    .option('shadow-color', {
        alias: ['shadow'],
        type: 'string',
        default: 'rgba(0, 0, 0, 0.5)',
        description: 'shadow color'
    })
    .command('$0 <dir>', 'create thumbnails collage of a directory', () => {}, async (args) => {
        try {
            await generateThumbnail(args.dir, args.out, args.columns, args.size, args.padding, args["text-color"], args['shadow-color'], args.background, 4, 12)
        } catch (e) {
            console.error(e)
        }
    })
    .help().argv

async function generateThumbnail(directory, outFile, columns, thumbnailSize, padding, textColor, shadowColor, backgroundColor, textTopMargin, textSize) {
    const files = (await new Promise((resolve, reject) => {
        fs.readdir(directory, async (err, files) => {
            if (err) {
                reject(err)
                return
            }
            resolve(files)
        })
    })).filter(f => /\.(png|jpg|jpeg|gif|svg|bmp)$/gi.test(f))
    if (files.length === 0) {
        throw new Error('Directory is empty')
    }
    const unknownImage = await canvas.loadImage(path.join(__dirname, 'unknown.png'))
    /** @type {canvas.Canvas} */
    let resultCanvas = null
    {
        let rowGenerator = createThumbnailRows(files)
        var thumbnailsResultCanvas = null
        for await (let row of rowGenerator) {
            const rowCanvas = row
            if (thumbnailsResultCanvas == null) {
                thumbnailsResultCanvas = rowCanvas
            } else {
                const previousCanvas = thumbnailsResultCanvas
                thumbnailsResultCanvas = canvas.createCanvas(Math.max(previousCanvas.width, rowCanvas.width), previousCanvas.height + rowCanvas.height)
                const ctx = thumbnailsResultCanvas.getContext('2d')
                ctx.drawImage(previousCanvas, 0, 0)
                ctx.drawImage(rowCanvas, 0, previousCanvas.height)
            }
        }
        resultCanvas = canvas.createCanvas(thumbnailsResultCanvas.width, thumbnailsResultCanvas.height)
        const resultCanvasCtx = resultCanvas.getContext('2d')
        resultCanvasCtx.fillStyle = backgroundColor
        resultCanvasCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height)
        resultCanvasCtx.drawImage(thumbnailsResultCanvas, 0, 0)
    }
    async function* createThumbnailRows(filesPool) {
        const filesLeft = Array.from(filesPool)
        let rowThumbnails = []
        while (filesLeft.length > 0) {
            const file = filesLeft.splice(0, 1)[0]
            try {
                rowThumbnails.push({ thumbnail: await createThumbnail(file, unknownImage), file })
            } catch (e) { }
            if (rowThumbnails.length >= columns || filesLeft.length === 0) {
                const rowWidth = rowThumbnails.length * (padding * 2 + thumbnailSize)
                const maxTextHeight = (function() {
                    const textCanvas = canvas.createCanvas(1, 1)
                    const ctx = textCanvas.getContext('2d')
                    ctx.font = `bold ${textSize}px sans-serif`
                    let maxSize = 0
                    for (let i = 0; i < rowThumbnails.length; i++) {
                        const textMeasures = ctx.measureText(rowThumbnails[i].file)
                        maxSize = Math.max(textMeasures.emHeightAscent + textMeasures.emHeightDescent, maxSize)
                    }
                    return maxSize
                })()
                const thumbnailMaxHeight = Math.max.apply(null, rowThumbnails.map(t => t.thumbnail.height))
                const rowHeight = thumbnailMaxHeight + textTopMargin + maxTextHeight + padding * 2
                const rowCanvas = canvas.createCanvas(rowWidth, rowHeight)
                const ctx = rowCanvas.getContext('2d')
                for (let i = 0; i < rowThumbnails.length; i++) {
                    const fileThumbnail = rowThumbnails[i]
                    ctx.shadowBlur = 2
                    ctx.shadowColor = shadowColor
                    ctx.shadowOffsetX = 2
                    ctx.shadowOffsetY = 2
                    ctx.drawImage(fileThumbnail.thumbnail,
                        Math.floor(i * (padding * 2 + thumbnailSize) + padding + thumbnailSize / 2 - fileThumbnail.thumbnail.width / 2),
                        Math.floor(padding + thumbnailMaxHeight / 2 - fileThumbnail.thumbnail.height / 2)
                    )
                    ctx.shadowBlur = 0
                    ctx.shadowColor = 'rgba(0, 0, 0, 0)'
                    ctx.shadowOffsetX = 0
                    ctx.shadowOffsetY = 0
                    ctx.font = `bold ${textSize}px sans-serif`
                    const textMeasures = ctx.measureText(fileThumbnail.file)
                    const textPosition = {
                        x: i * (padding * 2 + thumbnailSize) + padding + Math.max(thumbnailSize / 2 - textMeasures.width / 2, 0),
                        y: thumbnailMaxHeight + padding + textTopMargin + textSize
                    }
                    ctx.fillStyle = textColor
                    ctx.fillText(fileThumbnail.file, textPosition.x, textPosition.y, thumbnailSize)
                }

                rowThumbnails = []
                yield rowCanvas
            }
        }
    }
    async function createThumbnail(file, fallbackImage) {
        let image = null
        try {
            console.log(`thumbnailing ${file}`)
            image = await canvas.loadImage(path.join(directory, file))
        } catch (e) {
            if (fallbackImage != null) {
                image = fallbackImage
            } else {
                throw e
            }
        }
        const scaleRatio = Math.min(thumbnailSize / image.naturalWidth, thumbnailSize / image.naturalHeight)
        const scaledWidth = Math.floor(image.naturalWidth * scaleRatio)
        const scaledHeight = Math.floor(image.naturalHeight * scaleRatio)
        const drawCanvas = canvas.createCanvas(scaledWidth, scaledHeight)
        const ctx = drawCanvas.getContext('2d')
        ctx.drawImage(image,
            0,
            0,
            scaledWidth,
            scaledHeight
        )
        return drawCanvas
    }
    await new Promise((resolve, reject) => {
        const finalOutFile = outFile == null ? `${path.basename(directory)}.png` : outFile
        const out = fs.createWriteStream(finalOutFile)
        const stream = /\.png$/gi.test(finalOutFile)
            ? resultCanvas.createPNGStream()
            : /\.(jpg|jpeg)$/gi.test(finalOutFile)
            ? resultCanvas.createJPEGStream({ quality: 1 })
            : resultCanvas.createPNGStream()
        stream.pipe(out)
        out.on('error', (err) => reject(err))
        out.on('finish', () => resolve())
    })
}