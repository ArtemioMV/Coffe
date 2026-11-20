import { QrSheet } from "@/modules/mesas/qr-sheet";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <QrSheet id={(await params).id} />; }
