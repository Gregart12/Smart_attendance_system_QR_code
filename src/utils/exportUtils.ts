import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AttendanceRecord } from '../types';
import { getDateKey } from './dateUtils';

const str = (value: unknown): string => (value === undefined || value === null ? '' : String(value));

/** RFC 4180: wrap in quotes and double any embedded quote. */
const csvCell = (value: unknown): string => `"${str(value).replace(/"/g, '""')}"`;

/**
 * Downloads Attendance Records as a styled PDF document
 */
export function exportAttendanceToPDF(
  records: AttendanceRecord[],
  title = 'Department of IT - Staff Attendance Report'
) {
  const doc = new jsPDF('landscape');

  // Title Header
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(title, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${records.length}`, 14, 25);

  const tableData = records.map((rec, index) => [
    index + 1,
    str(rec.staffId) || 'N/A',
    str(rec.staffName),
    str(rec.department),
    str(rec.date),
    str(rec.time),
    str(rec.status).toUpperCase(),
    `${str(rec.distanceFromCenterMeters)}m`,
    str(rec.deviceInfo) || 'Browser'
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['#', 'Staff ID', 'Staff Name', 'Department', 'Date', 'Time', 'Status', 'Distance', 'Device']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    }
  });

  doc.save(`Attendance_Report_${getDateKey()}.pdf`);
}

/**
 * Downloads Attendance Records as Excel spreadsheet (.xlsx)
 */
export function exportAttendanceToExcel(records: AttendanceRecord[]) {
  const data = records.map(rec => ({
    'Staff ID': str(rec.staffId),
    'Staff Name': str(rec.staffName),
    'Department': str(rec.department),
    'Session Title': str(rec.sessionTitle),
    'Date': str(rec.date),
    'Time': str(rec.time),
    'Status': str(rec.status),
    'GPS Distance (m)': rec.distanceFromCenterMeters,
    'Latitude': rec.latitude,
    'Longitude': rec.longitude,
    'Device Info': str(rec.deviceInfo)
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

  XLSX.writeFile(workbook, `IT_Staff_Attendance_${getDateKey()}.xlsx`);
}

/**
 * Downloads Attendance Records as CSV file
 */
export function exportAttendanceToCSV(records: AttendanceRecord[]) {
  const headers = ['Staff ID', 'Staff Name', 'Department', 'Session', 'Date', 'Time', 'Status', 'Distance (m)', 'Device'];

  const csvRows = [
    headers.map(csvCell).join(','),
    ...records.map(rec => [
      csvCell(rec.staffId),
      csvCell(rec.staffName),
      csvCell(rec.department),
      csvCell(rec.sessionTitle),
      csvCell(rec.date),
      csvCell(rec.time),
      csvCell(rec.status),
      csvCell(rec.distanceFromCenterMeters),
      csvCell(rec.deviceInfo)
    ].join(','))
  ];

  // Prepend a BOM so Excel opens UTF-8 names correctly.
  const blob = new Blob([`\uFEFF${csvRows.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Attendance_Log_${getDateKey()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
