        // ==================== SALES REPORT ====================
        async function renderSales() {
            const data = await KNShop.adminGetSalesReport(30);
            if (!data.success) return;
            let html = '<h4 style="margin-bottom:15px;">📊 รายงานรายวัน (30 วัน)</h4>';

            if (data.dailySales.length > 0) {
                const maxTotal = Math.max(...data.dailySales.map(d => d.total));
                html += `<table class="admin-table"><thead><tr><th>วันที่</th><th>ออเดอร์</th><th>ยอดขาย</th><th>กราฟ</th></tr></thead><tbody>`;
                data.dailySales.forEach(d => {
                    const w = Math.max(5, (d.total / maxTotal) * 100);
                    html += `<tr><td style="font-weight:600;">${d._id}</td><td>${d.count}</td><td style="font-weight:700; color:var(--primary-color);">${d.total.toLocaleString()} P</td>
                    <td><div style="background:linear-gradient(90deg, #03a9f4, #0288d1); height:20px; width:${w}%; border-radius:10px;"></div></td></tr>`;
                });
                html += '</tbody></table>';
            } else {
                html += '<p style="color:#999; text-align:center;">ยังไม่มีข้อมูล</p>';
            }

            // Monthly
            if (data.monthlySales?.length > 0) {
                html += '<h4 style="margin:30px 0 15px;">📅 รายงานรายเดือน</h4>';
                html += `<table class="admin-table"><thead><tr><th>เดือน</th><th>ออเดอร์</th><th>ยอดขาย</th></tr></thead><tbody>`;
                data.monthlySales.forEach(m => {
                    html += `<tr><td style="font-weight:600;">${m._id}</td><td>${m.count}</td><td style="font-weight:700; color:var(--primary-color);">${m.total.toLocaleString()} P</td></tr>`;
                });
                html += '</tbody></table>';
            }

            // Topup summary
            const tu = data.topupStats;
            html += `<div style="display:flex; justify-content:space-around; margin-top:25px; padding:20px; background:#f8f9fa; border-radius:8px;">
                <div style="text-align:center;"><div style="font-size:24px; font-weight:700;">${tu.count}</div><div style="font-size:13px; color:#777;">เติมเงินทั้งหมด</div></div>
                <div style="text-align:center;"><div style="font-size:24px; font-weight:700; color:var(--primary-color);">${tu.total.toLocaleString()} P</div><div style="font-size:13px; color:#777;">ยอดเติมเงินรวม</div></div>
            </div>`;

            document.getElementById('panel-sales').innerHTML = html;
        }
