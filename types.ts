
export interface CapturedThreat {
  id: string;
  timestamp: string;
  image: string;
}

export interface SecurityState {
  isActive: boolean;
  isAlarmTriggered: boolean;
  isProcessing: boolean;
  threats: CapturedThreat[];
}
