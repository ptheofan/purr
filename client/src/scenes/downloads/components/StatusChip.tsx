import { GroupBasicInfoFragment } from "../../../__generated__/graphql";
import { ChipProps } from "@mui/material";
import DoneIcon from '@mui/icons-material/Done';
import { Chip } from "@mui/material";

const StatusChip = (group: GroupBasicInfoFragment) => {
    const value = group.state && group.state !== 'Ready' ? group.state : group.status;
    let finalProps: ChipProps;
    let label: string = value

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