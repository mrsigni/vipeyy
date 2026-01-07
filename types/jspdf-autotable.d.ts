// src/types/jspdf-autotable.d.ts
import { jsPDF } from "jspdf";
import { UserOptions } from "jspdf-autotable"; // Import UserOptions untuk tipe

declare module "jspdf" {
  interface jsPDF {
    // Definisi untuk metode autoTable yang ditambahkan
    autoTable: ((options?: UserOptions) => void) & {
      previous: {
        readonly startY?: number;
        readonly finalY: number;
        readonly pageNumber: number;
        readonly settings: UserOptions;
      };
    };
    // Deklarasi getFontSize karena kadang default tipe jspdf tidak lengkap
    getFontSize: () => number;
    // Deklarasi untuk properti internal yang sering digunakan
    internal: jsPDF['internal'] & {
      getNumberOfPages: () => number;
    };
  }
}