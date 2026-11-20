import { Tracking } from "@/modules/pedidos/tracking";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <Tracking id={(await params).id} />; }
