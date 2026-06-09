from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, PatternFill, Alignment
import os

src='src=Planning_Formation_Sessions1222.xlsx'
wb=load_workbook(src)
ws=wb.active

new_wb=Workbook()
new_ws=new_wb.active
new_ws.title="Info"

# headers
headers=["#", "Groupe", "Heure session", "Nom du centre", "Code Centre", "Nom de l'agent", "Téléphone"]
new_ws.append(headers)

# style headers
fill=PatternFill("solid", fgColor="FFD966")
for c in new_ws[1]:
    c.font=Font(bold=True)
    c.fill=fill
    c.alignment=Alignment(horizontal="center")

# copy planning data, keep agent/phone blank
for r in range(11, ws.max_row+1):
    vals=[ws.cell(r,col).value for col in range(1,8)]
    if vals[0] is None:
        continue
    vals[5]=""  # Nom agent blank
    vals[6]=""  # Téléphone blank
    new_ws.append(vals)

for col in ['A','B','C','D','E','F','G']:
    new_ws.column_dimensions[col].width=25

out='/mnt/data/Info_Deuxieme_Version.xlsx'
new_wb.save(out)
print(out)