import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transporter } from "@/lib/mailer";

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();

    if (!id || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const payout = await prisma.videoPayout.findUnique({
      where: { id: Number(id) },
      include: {
        user: true,
        details: true,
      },
    });

    if (!payout) {
      return NextResponse.json({ error: "Payout tidak ditemukan" }, { status: 404 });
    }

    if (payout.status !== "pending") {
      return NextResponse.json({ error: "Payout sudah diproses" }, { status: 400 });
    }

    if (status === "rejected") {
      await prisma.$transaction(
        payout.details.map((detail) =>
          prisma.video.update({
            where: { id: detail.videoId },
            data: {
              withdrawnEarnings: {
                decrement: detail.amount,
              },
            },
          })
        )
      );
    }

    await prisma.videoPayout.update({
      where: { id: Number(id) },
      data: {
        status,
        paidAt: new Date(),
      },
    });

    const approved = status === "approved";

    const subject = approved
      ? "Permintaan Pembayaran Kamu Disetujui"
      : "Permintaan Pembayaran Kamu Ditolak";

    const html = approved
      ? `
        <p>Halo ${payout.user.fullName},</p>
        <p>Permintaan pembayaran kamu sebesar <strong>$${payout.amount.toFixed(2)}</strong> telah <strong>disetujui</strong> oleh tim ViPey.</p>
        <p>Proses transfer dana akan dilakukan maksimal dalam waktu <strong>2 hari kerja</strong>. Mohon pastikan informasi pembayaran kamu sudah benar.</p>
        <p>Terima kasih telah berkontribusi di platform ViPey. Jika ada pertanyaan lebih lanjut, silakan hubungi tim support kami.</p>
        <br />
        <p>Salam hangat,</p>
        <p><strong>Tim ViPey</strong></p>
      `
      : `
        <p>Halo ${payout.user.fullName},</p>
        <p>Mohon maaf, permintaan pembayaran kamu sebesar <strong>$${payout.amount.toFixed(2)}</strong> telah <strong>ditolak</strong>.</p>
        <p>Saldo kamu telah dikembalikan ke video-video terkait dan dapat kamu tarik kembali.</p>
        <p>Jika kamu merasa ini adalah kekeliruan atau memiliki pertanyaan, silakan hubungi tim support kami untuk klarifikasi lebih lanjut.</p>
        <br />
        <p>Hormat kami,</p>
        <p><strong>Tim ViPey</strong></p>
      `;

    await transporter.sendMail({
      from: `"Admin ViPey" <${process.env.SMTP_USER}>`,
      to: payout.user.email,
      subject,
      html,
    });

    return NextResponse.json({ message: "Status diperbarui dan email terkirim" });
  } catch (error) {
    console.error("[PATCH_PAYOUT_ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}