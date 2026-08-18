import { InitCountManage } from './countManage'
import { InitCpuStats } from './cpuStats'

export function RegisterIpcFn(): void {
    InitCountManage()
    InitCpuStats()
}
