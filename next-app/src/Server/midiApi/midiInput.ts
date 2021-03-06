// @ts-ignore
// see documentation: https://github.com/justinlatimer/node-midi
// import midi from 'midi';
const midi = require('midi');
import { typedEventEmitter } from './eventEmitter';
import { NoteOffMessage, NoteOnMessage, ControlChangeMessage, PolyAftertouchMessage, ProgramChangeMessage, ChannelAftertouchMessage, PitchBendDataMessage, MidiMessage, ChannelVoiceMessage, SystemExclusiveMessageType, SystemRealTimeMessageType, SystemCommonMessageType, SystemMessage, UndefinedChannelVoiceMessage } from './midiTypes';
import { ChannelVoiceMessageType, SystemExclusiveMessage, SystemCommonMessage, SystemRealTimeMessage } from './midiTypes';

type MidiMessagesEventMap = {
    'message': MidiMessage, // for easy monitoring of all messages
    'channel voice message': ChannelVoiceMessage,
    'noteoff': NoteOffMessage,
    'noteon': NoteOnMessage,
    'poly aftertouch': PolyAftertouchMessage,
    'cc': ControlChangeMessage,
    'program': ProgramChangeMessage,
    'channel aftertouch': ChannelAftertouchMessage,
    'pitch': PitchBendDataMessage,
    'sysex': SystemExclusiveMessage,
    'sys common': SystemCommonMessage,
    'sys real time': SystemRealTimeMessage
};

export class Input {
    input = new midi.input();
    midiMessageEmitter = typedEventEmitter<MidiMessagesEventMap>();

    constructor(name: string) {
        // Do not ignore sysex, timing and active sensing messages
        this.input.ignoreTypes(false, false, false);

        // Count the available input ports
        let found = false;
        for (let i = 0; i < this.input.getPortCount(); i++) {
            // Get the name of a specified input port and compare with name that the user entered
            if (name === this.input.getPortName(i)) {
                found = true;
                // Open the input port
                this.input.openPort(i);
            }
        }
        if (!found) {
            throw new Error('No MIDI Input found with name: ' + name);
        }

        // Configure a callback for MIDI messgaes
        this.input.on('message', (_deltaTime: number, message: number[]) => {
            const midiMessage: MidiMessage = this.parseAndEmitMidiMessage(message);
            this.midiMessageEmitter.emit('message', midiMessage);
        });
    }

    private parseAndEmitMidiMessage(message: number[]): MidiMessage {
        if (message[0] >= 0xF0) { // System messages
            const type = message[0];
            // let messageHex: string = '';
            // message.forEach((value: number) => {
            //     messageHex += value.toString(16);
            //     messageHex += ' ';
            // });
            if (type in SystemExclusiveMessageType) {
                const sysExMessage: SystemMessage = {
                    rawData: message,
                    type: type
                };
                this.midiMessageEmitter.emit('sysex', sysExMessage);
                return sysExMessage;
            } else if (type in SystemCommonMessageType) {
                const sysCommonMessage: SystemCommonMessage = {
                    rawData: message,
                    type: type
                };
                this.midiMessageEmitter.emit('sys common', sysCommonMessage);
                return sysCommonMessage;
            } else if (type in SystemRealTimeMessageType) {
                const sysRealTimeMessage: SystemRealTimeMessage = {
                    rawData: message,
                    type: type
                }
                this.midiMessageEmitter.emit('sys real time', sysRealTimeMessage);
                return sysRealTimeMessage;
            }
            return { type: undefined, rawData: message };
        } else { // Channel message
            // TODO: deal with running status (no status byte in subsequenct messages)
            const type = message[0] >> 4; // move upper 4 bits to lower 4 bits
            const channel = message[0] & 0xF; // only care for lower 4 bits

            let channelVoiceMessage: ChannelVoiceMessage;
            switch (type) {
                case ChannelVoiceMessageType.NOTE_OFF:
                    const noteOffMessage = new NoteOffMessage(channel, message[1], message[2]);
                    this.midiMessageEmitter.emit('noteoff', noteOffMessage);
                    channelVoiceMessage = noteOffMessage;
                    break;
                case ChannelVoiceMessageType.NOTE_ON:
                    const noteOnMessage = new NoteOnMessage(channel, message[1], message[2]);
                    this.midiMessageEmitter.emit('noteon', noteOnMessage);
                    channelVoiceMessage = noteOnMessage;
                    break;
                case ChannelVoiceMessageType.POLY_AFTERTOUCH:
                    const polyAftertouchMessage = new PolyAftertouchMessage(channel, message[1], message[2]);
                    this.midiMessageEmitter.emit('poly aftertouch', polyAftertouchMessage);
                    channelVoiceMessage = polyAftertouchMessage;
                    break;
                case ChannelVoiceMessageType.CONTROL_CHANGE:
                    const controlChangeMessage = new ControlChangeMessage(channel, message[1], message[2]);
                    this.midiMessageEmitter.emit('cc', controlChangeMessage);
                    channelVoiceMessage = controlChangeMessage;
                    break;
                case ChannelVoiceMessageType.PROGRAM_CHANGE:
                    const programChangeMessage = new ProgramChangeMessage(channel, message[1]);
                    this.midiMessageEmitter.emit('program', programChangeMessage);
                    channelVoiceMessage = programChangeMessage;
                    break;
                case ChannelVoiceMessageType.CHANNEL_AFTERTOUCH:
                    const channelAftertouchMessage = new ChannelAftertouchMessage(channel, message[1]);
                    this.midiMessageEmitter.emit('channel aftertouch', channelAftertouchMessage);
                    channelVoiceMessage = channelAftertouchMessage;
                    break;
                case ChannelVoiceMessageType.PITCH_BEND:
                    const pitchBendMessage = new PitchBendDataMessage(channel, message[1], message[2]);
                    this.midiMessageEmitter.emit('pitch', pitchBendMessage);
                    channelVoiceMessage = pitchBendMessage;
                    break;
                default:
                    channelVoiceMessage = new UndefinedChannelVoiceMessage();
            }
            this.midiMessageEmitter.emit('channel voice message', channelVoiceMessage);
            return channelVoiceMessage;
        }
    }

    // https://stackoverflow.com/questions/48232339/typescript-make-one-parameter-type-depend-on-the-other-parameter
    public onMidiEvent<K extends keyof MidiMessagesEventMap>(eventName: K, fn: (message: MidiMessagesEventMap[K]) => void) {
        this.midiMessageEmitter.on(eventName, fn);
    }

    public offMidiEvent<K extends keyof MidiMessagesEventMap>(eventName: K, fn: (message: MidiMessagesEventMap[K]) => void) {
        this.midiMessageEmitter.off(eventName, fn);
    }

    public close() {
        this.input.close();
    }
}

export function getInputNames(): string[] {
    const input = new midi.input();
    const inputs: string[] = [];
    for (let i = 0; i < input.getPortCount(); i++) {
        inputs.push(input.getPortName(i));
    }
    // input.closePort(); // no need to close ports since none were opened
    return inputs;
}
