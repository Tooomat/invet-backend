export function changeEmailTemplate(params: {
    fullName: string
    verifyUrl: string
    expiresIn: string
}): { subject: string; html: string } {
    return {
        subject: 'Verifikasi email baru kamu — Invet',
        html: `
            <body style="margin:0; padding:0; background:#f4f4f5; font-family: Arial, sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" style="padding: 32px 16px;">
                    <tr>
                    <td align="center">
                        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; border: 1px solid #e5e7eb;">

                        <!-- HEADER -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #D51C39 0%, #760031 100%); padding: 32px 32px 48px; text-align:center;">
                                <div style="font-size:22px; font-weight:700; color:#ffffff; letter-spacing:1px;">INVET</div>
                                <div style="font-size:12px; color:rgba(255,255,255,0.7); margin-top:4px; letter-spacing:2px;">Invitation Online</div>
                            </td>
                        </tr>

                        <!-- CARD CONTENT -->
                        <tr>
                            <td align="center" style="padding:0 16px 24px;">

                                <table
                                    width="100%"
                                    cellpadding="0"
                                    cellspacing="0"
                                    style="
                                        background:#ffffff;
                                        border:1px solid #ECECEC;
                                        border-radius:0px 0px 18px 18px;
                                        margin-top:-38px;
                                        box-shadow:0 8px 24px rgba(0,0,0,.08);
                                    "
                                >

                                    <!-- ICON + TITLE -->
                                    <tr>
                                        <td align="center" style="padding:42px 40px 20px;">

                                            <table cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td
                                                        align="center"
                                                        valign="middle"
                                                        width="74"
                                                        height="74"
                                                        style="
                                                            background:#FFF0F2;
                                                            border-radius:50%;
                                                        "
                                                    >
                                                        <img
                                                            src="https://cdn-icons-png.flaticon.com/512/561/561127.png"
                                                            width="34"
                                                            height="34"
                                                            alt="Email"
                                                            style="display:block;"
                                                        />
                                                    </td>
                                                </tr>
                                            </table>

                                            <div style="height:22px;"></div>

                                            <div
                                                style="
                                                    font-size:20px;
                                                    font-weight:700;
                                                    color:#191A23;
                                                    line-height:30px;
                                                "
                                            >
                                                Verifikasi Email Baru Kamu
                                            </div>

                                            <div style="height:10px;"></div>

                                            <div
                                                style="
                                                    font-size:15px;
                                                    color:#6B7280;
                                                    line-height:24px;
                                                "
                                            >
                                                Konfirmasi perubahan alamat email akun kamu
                                            </div>

                                        </td>
                                    </tr>

                                    <!-- BODY -->
                                    <tr>
                                        <td style="padding:10px 40px 40px;">

                                            <p style="margin:0 0 18px;font-size:15px;line-height:28px;color:#374151;">
                                                Halo,
                                                <strong>${params.fullName}</strong>
                                            </p>

                                            <p style="margin:0 0 34px;font-size:15px;line-height:30px;color:#374151;">
                                                Kami menerima permintaan untuk mengganti alamat email akun
                                                <strong style="color:#D51C39;">Invet</strong> kamu.
                                                Klik tombol di bawah untuk memverifikasi alamat email baru kamu.
                                            </p>

                                            <table width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td align="center">
                                                        <a
                                                            href="${params.verifyUrl}"
                                                            style="
                                                                display:inline-block;
                                                                background:#E11D48;
                                                                color:#ffffff;
                                                                text-decoration:none;
                                                                font-size:15px;
                                                                font-weight:700;
                                                                border-radius:8px;
                                                                padding:16px 42px;
                                                            "
                                                        >
                                                            Verifikasi Email Baru
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>

                                            <div style="height:32px;"></div>

                                            <!-- WARNING BOX -->
                                            <table
                                                width="100%"
                                                cellpadding="0"
                                                cellspacing="0"
                                                style="
                                                    background:#FFF8E8;
                                                    border:1px solid #F5D68A;
                                                    border-radius:8px;
                                                    margin-bottom:16px;
                                                "
                                            >
                                                <tr>
                                                    <td
                                                        style="
                                                            padding:16px 18px;
                                                            font-size:14px;
                                                            color:#8A5A00;
                                                            line-height:22px;
                                                        "
                                                    >
                                                        Link ini akan kedaluwarsa dalam
                                                        <strong>${params.expiresIn}</strong>.
                                                    </td>
                                                </tr>
                                            </table>

                                            <!-- INFO BOX -->
                                            <table
                                                width="100%"
                                                cellpadding="0"
                                                cellspacing="0"
                                                style="
                                                    background:#FFF0F2;
                                                    border:1px solid #FECDD3;
                                                    border-radius:8px;
                                                "
                                            >
                                                <tr>
                                                    <td
                                                        style="
                                                            padding:16px 18px;
                                                            font-size:14px;
                                                            color:#9F1239;
                                                            line-height:22px;
                                                        "
                                                    >
                                                        Setelah verifikasi berhasil, kamu akan otomatis keluar dan perlu login ulang menggunakan email baru kamu.
                                                    </td>
                                                </tr>
                                            </table>

                                        </td>
                                    </tr>

                                </table>

                            </td>
                        </tr>

                        <!-- FOOTER -->
                        <tr>
                            <td style="padding:24px; text-align:center;">
                                <p style="font-size:12px; color:#9CA3AF; margin:0 0 4px;">
                                    Jika kamu tidak meminta perubahan email ini, segera amankan akun kamu dengan mengganti password.
                                </p>
                                <p style="font-size:12px; color:#D1D5DB; margin:0;">
                                    &copy; ${new Date().getFullYear()} Invet &middot; Semua hak dilindungi
                                </p>
                            </td>
                        </tr>

                        </table>
                    </td>
                    </tr>
                </table>
            </body>
        `
    }
}