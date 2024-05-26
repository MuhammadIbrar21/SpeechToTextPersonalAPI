// mkdir speech - to - text - server
// cd speech - to - text - server
// npm init - y
// npm install express multer @google-cloud / speech

// create server.js

const express = require('express');
const multer = require('multer');
const { SpeechClient } = require('@google-cloud/speech');
const fs = require('fs');
const path = require('path');

// Configure Google Cloud Speech client
const speechClient = new SpeechClient({
    keyFilename: 'path/to/your/service-account-key.json',
});

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/upload', upload.single('audio'), async (req, res) => {
    try {
        const filePath = path.join(__dirname, req.file.path);
        const file = fs.readFileSync(filePath);

        const audioBytes = file.toString('base64');

        const audio = {
            content: audioBytes,
        };

        const config = {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
        };

        const request = {
            audio: audio,
            config: config,
        };

        const [response] = await speechClient.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');

        fs.unlinkSync(filePath); // Remove the uploaded file

        res.json({ transcript: transcription });
    } catch (error) {
        console.error('Error processing audio file:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Replace 'path/to/your/service-account-key.json' with the actual path to your Google Cloud service account JSON key file.

// Modify your Expo app to record audio, upload it to your server, and handle the response.

// Install Axios for HTTP requests

// expo install axios

import React, { useState, useEffect } from 'react';
import { View, Button, Text, Linking, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import * as Contacts from 'expo-contacts';
import { Audio } from 'expo-av';
import axios from 'axios';

const VoiceCommand = () => {
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recognizedCommand, setRecognizedCommand] = useState('');

    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync().catch((error) => console.log(error));
            }
        };
    }, [recording]);

    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission to access microphone is required!');
                return;
            }

            const newRecording = new Audio.Recording();
            await newRecording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
            await newRecording.startAsync();
            setRecording(newRecording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        try {
            if (!recording) {
                return;
            }
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            console.log('Recording URI:', uri);

            const formData = new FormData();
            formData.append('audio', {
                uri,
                type: 'audio/wav',
                name: 'audio.wav',
            });

            const response = await axios.post('http://your-server-ip:3000/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const { transcript } = response.data;
            console.log('Transcript:', transcript);
            setRecognizedCommand(transcript);
            handleVoiceCommand(transcript);
            setRecording(null);
        } catch (err) {
            console.error('Failed to stop recording', err);
        }
    };

    const handleVoiceCommand = async (command) => {
        command = command.toLowerCase();
        if (command.includes('call')) {
            const name = command.replace('call', '').trim();
            await makePhoneCall(name);
        }
    };

    const makePhoneCall = async (name) => {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers],
            });

            if (data.length > 0) {
                const contact = data.find(
                    (contact) => contact.name.toLowerCase() === name.toLowerCase()
                );

                if (contact && contact.phoneNumbers && contact.phoneNumbers.length > 0) {
                    const phoneNumber = contact.phoneNumbers[0].number;
                    Speech.speak(`Calling ${name}`);
                    Linking.openURL(`tel:${phoneNumber}`);
                } else {
                    Speech.speak(`${name} not found in contacts`);
                }
            } else {
                Speech.speak('No contacts available');
            }
        } else {
            Alert.alert('Permission denied');
        }
    };

    return (
        <View style={{ padding: 20 }}>
            <Button
                title={isRecording ? "Stop Recording" : "Start Voice Recognition"}
                onPress={isRecording ? stopRecording : startRecording}
            />
            <Text>Recognized Command: {recognizedCommand}</Text>
        </View>
    );
};

export default VoiceCommand;

// Notes
// Backend Server: Make sure your backend server is running and accessible from your device.Replace 'http://your-server-ip:3000/upload' with the actual IP address and port of your server.
//     CORS: If you're testing this on a physical device, ensure your backend server has the appropriate CORS configuration to accept requests from your app.
// Permissions: Ensure all necessary permissions are granted, especially for recording audio and accessing contacts.
// By following these steps, you can create a dynamic voice - controlled app using Expo Go that processes audio commands with Google Speech - to - Text and makes phone calls based on recognized commands.