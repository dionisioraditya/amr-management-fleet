interface RobotFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    robotModalMode: 'create' | 'edit';
    robotFormId: string;
    setRobotFormId: (val: string) => void;
    robotFormName: string;
    setRobotFormName: (val: string) => void;
    robotFormIp: string;
    setRobotFormIp: (val: string) => void;
    robotFormStatus: string;
    setRobotFormStatus: (val: string) => void;
    robotFormBattery: number;
    setRobotFormBattery: (val: number) => void;
    handleSaveVehicle: (e: React.FormEvent) => void;
    isSavingRobot: boolean;
}

export function RobotFormModal({
    isOpen,
    onClose,
    robotModalMode,
    robotFormId,
    setRobotFormId,
    robotFormName,
    setRobotFormName,
    robotFormIp,
    setRobotFormIp,
    robotFormStatus,
    setRobotFormStatus,
    robotFormBattery,
    setRobotFormBattery,
    handleSaveVehicle,
    isSavingRobot,
}: RobotFormModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                        <span className="font-mono text-[10px] font-bold tracking-wider text-primary uppercase">
                            Fleet Registry CRUD
                        </span>
                        <h3 className="font-headline-md text-lg font-bold text-on-surface uppercase">
                            {robotModalMode === 'create'
                                ? 'Register AMR Unit'
                                : `Edit AMR Config // ${robotFormId}`}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-lg p-1 text-tertiary hover:bg-slate-100"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSaveVehicle} className="mt-4 space-y-4">
                    <div>
                        <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                            AMR Unit ID
                        </label>
                        <input
                            type="text"
                            required
                            disabled={robotModalMode === 'edit'}
                            value={robotFormId}
                            onChange={(e) => setRobotFormId(e.target.value)}
                            placeholder="AMR-03"
                            className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface disabled:opacity-60"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                            Unit Designation
                        </label>
                        <input
                            type="text"
                            required
                            value={robotFormName}
                            onChange={(e) => setRobotFormName(e.target.value)}
                            placeholder="Heavy Pallet Carrier 03"
                            className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-body-sm text-xs text-on-surface"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                IP Address (ROS 2 Host)
                            </label>
                            <input
                                type="text"
                                required
                                value={robotFormIp}
                                onChange={(e) => setRobotFormIp(e.target.value)}
                                placeholder="10.32.254.195"
                                className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                Initial Battery (%)
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                required
                                value={robotFormBattery}
                                onChange={(e) => setRobotFormBattery(Number(e.target.value))}
                                className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                            Operational State
                        </label>
                        <select
                            value={robotFormStatus}
                            onChange={(e) => setRobotFormStatus(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface"
                        >
                            <option value="idle">IDLE</option>
                            <option value="active">ACTIVE</option>
                            <option value="charging">CHARGING</option>
                            <option value="maintenance">MAINTENANCE</option>
                            <option value="error">ERROR</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer rounded-lg px-4 py-2 font-label-md text-xs font-semibold text-tertiary uppercase hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSavingRobot}
                            className="cursor-pointer rounded-lg bg-primary px-5 py-2 font-label-md text-xs font-bold text-white uppercase shadow-sm hover:bg-secondary disabled:opacity-50"
                        >
                            {isSavingRobot
                                ? 'Saving...'
                                : robotModalMode === 'create'
                                  ? 'Register Unit'
                                  : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
