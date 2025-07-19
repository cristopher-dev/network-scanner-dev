import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import Papa from 'papaparse';

interface ScanData {
  ip: string;
  hostname?: string;
  status: string;
  ports?: number[];
  [key: string]: any;
}

class ReportGenerator {
  static exportToPDF(data: ScanData[], filename: string): void {
    const doc = new jsPDF();

    // Título del reporte
    doc.setFontSize(16);
    doc.text('Network Scan Report', 10, 20);

    // Información del escaneo
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 10, 30);
    doc.text(`Total Devices: ${data.length}`, 10, 40);

    // Datos del escaneo
    let yPosition = 50;
    data.forEach((device, index) => {
      if (yPosition > 270) {
        // Nueva página si se queda sin espacio
        doc.addPage();
        yPosition = 20;
      }

      const deviceInfo = `${index + 1}. ${device.ip} - ${device.hostname || 'Unknown'} (${device.status})`;
      doc.text(deviceInfo, 10, yPosition);
      yPosition += 10;
    });

    doc.save(`${filename}.pdf`);
  }

  static exportToCSV(data: ScanData[], filename: string): void {
    // Usar Papa Parse para generar CSV con mejor formato
    const csv = Papa.unparse(data, {
      quotes: true,
      delimiter: ',',
      header: true,
      skipEmptyLines: true,
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  }

  static exportToJSON(data: ScanData[], filename: string): void {
    const formattedData = {
      timestamp: new Date().toISOString(),
      deviceCount: data.length,
      devices: data,
    };

    const blob = new Blob([JSON.stringify(formattedData, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    saveAs(blob, `${filename}.json`);
  }

  static generateReport(data: ScanData[], format: 'pdf' | 'csv' | 'json', filename: string): void {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para exportar');
    }

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
        throw new Error('Formato no soportado. Use: pdf, csv, or json');
    }
  }
}

export default ReportGenerator;
