let divSelectRoom=document.getElementById("selectRoom")
let divConsultingRoom=document.getElementById("consultingRoom")
let inputRoomNumber=document.getElementById("roomNumber")
let btnGoRoom=document.getElementById("goRoom")
let localVideo=document.getElementById("localVideo")
let remoteVideo=document.getElementById("remoteVideo")
let inputCallName=document.getElementById("inputCallName")

let roomNumber,localStream,remoteStream,rtcPeerConnection,isCaller,dataChannel

const iceServer = {
    'iceServer':[
        {'urls':'stun:stun.services.morzilla.com'},
        {'urls':'stun:stun.l.google.com:19302'}
    ]
}

const streamConstraints ={
    audio:true,
    video:true
}

const socket= io()

btnGoRoom.onclick = ()=>{
    if(inputRoomNumber.value === ''){
        alert('plz enter a valid room Id')
    }
    else{
        roomNumber=inputRoomNumber.value
        socket.emit('create or join',roomNumber)
        
        divSelectRoom.style='display:none'
        divConsultingRoom.style='display:flex'
    }
}


socket.on('created',room=>{
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream=>{
            localStream=stream
            localVideo.srcObject=stream
            isCaller=true
        })
        .catch(err=>{
            alert(`An error occured ${err}`)
        })
})


socket.on('joined',room=>{
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream=>{
            localStream=stream
            localVideo.srcObject=stream
            socket.emit('ready',roomNumber)
        })
        .catch(err=>{
            alert(`An error occured ${err}`)
        })
})

socket.on('ready',()=>{
    if (isCaller) {
        rtcPeerConnection=new RTCPeerConnection(iceServer)
        rtcPeerConnection.onicecandidate=onIceCandidate
        rtcPeerConnection.ontrack=onAddStream
        rtcPeerConnection.addTrack(localStream.getTracks()[0],localStream)
        rtcPeerConnection.addTrack(localStream.getTracks()[1],localStream)
        rtcPeerConnection.createOffer()
            .then(sessionDescription=>{
                rtcPeerConnection.setLocalDescription(sessionDescription)
                socket.emit('offer',{
                    type:'offer',
                    sdp:sessionDescription,
                    room:roomNumber
                })

            })
            .catch(err=>{
                console.log(err)
            })

        dataChannel=rtcPeerConnection.createDataChannel(roomNumber)
        console.log('data Channel',dataChannel)
    }
})


socket.on('offer',(event)=>{
    if (!isCaller) {
        console.log(event)
        rtcPeerConnection=new RTCPeerConnection(iceServer)
        rtcPeerConnection.onicecandidate=onIceCandidate
        rtcPeerConnection.ontrack=onAddStream
        rtcPeerConnection.addTrack(localStream.getTracks()[0],localStream)
        rtcPeerConnection.addTrack(localStream.getTracks()[1],localStream)
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
        rtcPeerConnection.createAnswer()
            .then(sessionDescription=>{
                rtcPeerConnection.setLocalDescription(sessionDescription)
                socket.emit('answer',{
                    type:'answer',
                    sdp:sessionDescription,
                    room:roomNumber
                })
            })
            .catch(err=>{
                console.log(err)
            })
    }
})

socket.on('answer',event=>{
    console.log(event)
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
})

socket.on('candidate',event=>{
    const candidate=new RTCIceCandidate({
        sdpMLineIndex:event.label,
        candidate:event.candidate
    })
    if(candidate){
    rtcPeerConnection.addIceCandidate(candidate)
    }
})

function onAddStream(event){
    remoteVideo.srcObject=event.streams[0]
    remoteStream=event.streams[0]
}

function onIceCandidate(event){
    if(event.candidate){
        console.log('sending ice candidate',event.candidate)
        socket.emit('candidate',{
            type:'candidate',
            label:event.candidate.sdpMLineIndex,
            id:event.candidate.sdpMid,
            candidate:event.candidate.candidate,
            room:roomNumber
        })
    }
}
