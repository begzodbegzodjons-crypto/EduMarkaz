'use client'

/**
 * Excel eksport funksiyasi - chiroyli formatlangan, rangli Excel fayl
 * HTML table formatida .xls fayl yaratadi (Excel to'liq ochadi)
 */

interface ExcelColumn {
  header: string
  key: string
  width?: number
}

interface ExcelExportOptions {
  filename: string
  title: string
  columns: ExcelColumn[]
  data: any[]
  headerColor?: string  // header background color
  headerTextColor?: string  // header text color
  altRowColor?: string  // alternating row color
}

export function exportToExcel(options: ExcelExportOptions) {
  const {
    filename,
    title,
    columns,
    data,
    headerColor = '#4F46E5',  // indigo
    headerTextColor = '#FFFFFF',
    altRowColor = '#F1F5F9',  // slate-100
  } = options

  // Excel uchun HTML table yaratamiz
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>${title}</x:Name>
      <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; }
        .title { font-size: 18px; font-weight: bold; color: ${headerColor}; padding: 10px; }
        .subtitle { font-size: 12px; color: #64748B; padding: 0 10px 10px; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: ${headerColor}; color: ${headerTextColor}; font-weight: bold; padding: 10px 8px; text-align: left; border: 1px solid ${headerColor}; font-size: 12px; }
        td { padding: 8px; border: 1px solid #E2E8F0; font-size: 11px; }
        tr:nth-child(even) td { background-color: ${altRowColor}; }
        tr:hover td { background-color: #E0E7FF; }
        .footer { font-size: 10px; color: #94A3B8; padding: 10px; }
      </style>
    </head>
    <body>
      <div class="title">${title}</div>
      <div class="subtitle">Sana: ${new Date().toLocaleDateString('uz-UZ')} · Jami: ${data.length} ta yozuv</div>
      <table>
        <thead>
          <tr>
  `

  columns.forEach((col) => {
    const width = col.width ? `width="${col.width}"` : ''
    html += `<th ${width}>${col.header}</th>`
  })

  html += `</tr></thead><tbody>`

  data.forEach((row, idx) => {
    html += '<tr>'
    columns.forEach((col) => {
      let val = row[col.key]
      if (val === null || val === undefined) val = ''
      if (typeof val === 'number') val = val.toLocaleString('ru-RU')
      html += `<td>${val}</td>`
    })
    html += '</tr>'
  })

  html += `
        </tbody>
      </table>
      <div class="footer">EduMarkaz ERP — ${new Date().toLocaleString('uz-UZ')}</div>
    </body>
    </html>
  `

  // Blob yaratamiz va yuklab olamiz
  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.xls`
  a.click()
  URL.revokeObjectURL(url)
}
