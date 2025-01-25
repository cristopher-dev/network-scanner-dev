import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

class ReportGenerator {
  static exportToPDF(data: any, filename: string) {
    const doc = new jsPDF();
    doc.text(JSON.stringify(data, null, 2), 10, 10);
    doc.save(`${filename}.pdf`);
  }

  static exportToCSV(data: any, filename: string) {
    const csvContent = "data:text/csv;charset=utf-8," + data.map((e: any) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, `${filename}.csv`);
  }

  static exportToJSON(data: any, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    saveAs(blob, `${filename}.json`);
  }

  static generateReport(data: any, format: 'pdf' | 'csv' | 'json', filename: string) {
    switch (format) {
      case 'pdf':
        this.exportToPDF(data, filename);
        break;
      case 'csv':
        this.exportToCSV(data, filename);
        break;
      case 'json':
        this.exportToJSON(data, filename);
        break;
      default:
        throw new Error('Formato no soportado');
    }
  }
}

export default ReportGenerator;
