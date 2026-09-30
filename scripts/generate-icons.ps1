param([int[]]$Sizes = @(192, 512))

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$outputDirectory = Join-Path $PSScriptRoot '..\assets\icons'
$manualConfig = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot '..\data\manual.json') | ConvertFrom-Json

foreach ($size in $Sizes) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.Color]::FromArgb(13, 82, 127))

  $margin = [int]($size * .19)
  $panel = [System.Drawing.Rectangle]::new($margin, $margin, $size - (2 * $margin), $size - (2 * $margin))
  $graphics.FillRectangle([System.Drawing.Brushes]::White, $panel)
  $header = [System.Drawing.Rectangle]::new($panel.X, $panel.Y, $panel.Width, [int]($size * .13))
  $graphics.FillRectangle([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(234, 245, 252)), $header)

  $font = [System.Drawing.Font]::new('Arial', [single]($size * .22), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $numberArea = [System.Drawing.RectangleF]::new($panel.X, $panel.Y + [int]($size * .09), $panel.Width, $panel.Height - [int]($size * .04))
  $graphics.DrawString([string]$manualConfig.machine.machineId, $font, [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(11, 49, 77)), $numberArea, $format)

  $bolt = [System.Drawing.Point[]]@(
    [System.Drawing.Point]::new([int]($size * .72), [int]($size * .1)),
    [System.Drawing.Point]::new([int]($size * .63), [int]($size * .29)),
    [System.Drawing.Point]::new([int]($size * .72), [int]($size * .29)),
    [System.Drawing.Point]::new([int]($size * .61), [int]($size * .46)),
    [System.Drawing.Point]::new([int]($size * .65), [int]($size * .33)),
    [System.Drawing.Point]::new([int]($size * .57), [int]($size * .33)),
    [System.Drawing.Point]::new([int]($size * .66), [int]($size * .1))
  )
  $graphics.FillPolygon([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 182, 66)), $bolt)
  $font.Dispose()
  $format.Dispose()
  $graphics.Dispose()
  $bitmap.Save((Join-Path $outputDirectory "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}
