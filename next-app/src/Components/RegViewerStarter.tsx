import React, { useState } from 'react';
import { Paper, makeStyles, Theme, Fab } from "@material-ui/core";
import PlayCircleFilledWhiteIcon from '@material-ui/icons/PlayCircleFilledWhite';
import { subscribeRegChange, unsubscribeRegChange } from '../Server/serverApi';
import RegViewerBackdrop from './RegViewerBackdrop';

const useStyle = makeStyles((theme: Theme) => ({
    center: {
        textAlign: "center"
    },
    startButton: {
        marginTop: theme.spacing(3),
        color: "#fff",
        background: `linear-gradient(45deg, ${theme.palette.secondary.light} 30%, #FF8E53 90%)`
    }
}));

const RegViewerStarter = () => {
    const classes = useStyle();
    const [currentReg, setCurrentReg] = useState<string>('');
    const [backdropOpen, setBackdropOpen] = useState<boolean>(false);

    const startRegViewer = () => {
        console.log('now subscribing to reg change');
        subscribeRegChange((newRegFilename: string) => {
            console.log(`selected first Registration Memory button of .RGT file ${newRegFilename}`);
            setCurrentReg(newRegFilename);
            const url = `/pdfs/${newRegFilename}.pdf`;
            open(encodeURIComponent(url));
        });
        setBackdropOpen(true);
    };

    const handleBackdropClose = () => {
        setBackdropOpen(false);
        unsubscribeRegChange();
    };

    return (
        <Paper elevation={0} className={classes.center}>

            {/* <Typography>Yeah, you're now ready for take-off.</Typography> */}
            <Fab className={classes.startButton} onClick={startRegViewer}>
                <PlayCircleFilledWhiteIcon />
            </Fab>
            <RegViewerBackdrop
                backdropOpen={backdropOpen}
                closeHandler={handleBackdropClose}
                currentReg={currentReg}
            />

        </Paper>
    );
};

function open(url: string) {
    console.log('will open url: ' + url);
    const windowProxy = window.open(url, '_blank');
    if (windowProxy) {
        windowProxy.focus();
    }
}

export default RegViewerStarter;
