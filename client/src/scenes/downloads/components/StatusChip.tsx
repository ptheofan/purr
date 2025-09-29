import { ChipProps, Chip } from "@mui/material";
import DoneIcon from '@mui/icons-material/Done';

interface StatusChipProps {
    status: string;
    state: string;
}

const StatusChip = ({ status, state }: StatusChipProps) => {
    const value = state && state !== 'Ready' ? state : status;
    let finalProps: ChipProps;
    const label: string = value

    switch (value) {
        case 'Initializing':  // From state
            finalProps = {
                size: 'small' as const,
                label,
                variant: 'outlined' as const,
                color: 'warning' as const,
            };
            break;
        case 'Completed':  // From status
            finalProps = {
                size: 'small' as const,
                label,
                variant: 'filled' as const,
                color: 'success' as const,
                icon: <DoneIcon />,
            };
            break;
        case 'Error':  // From status
            finalProps = {
                size: 'small' as const,
                label,
                variant: 'filled' as const,
                color: 'error' as const,
            };
            break;
        case 'Paused':  // From status
            finalProps = {
                size: 'small' as const,
                label: value,
                variant: 'filled' as const,
                color: 'default' as const,
            };
            break;
        case 'Pending':  // From status
            finalProps = {
                size: 'small' as const,
                label,
                variant: 'filled' as const,
                color: 'default' as const,
            };
            break;
        case 'Downloading':  // From status
            finalProps = {
                size: 'small' as const,
                label,
                variant: 'filled' as const,
                color: 'warning' as const,
            };
            break;
        default:
            finalProps = {
                size: 'small' as const,
                label,
                variant: 'filled' as const,
                color: 'default' as const,
            };

    }

    return (
        <Chip {...finalProps} />
    );
};

export default StatusChip;