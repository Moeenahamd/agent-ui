import { AfterViewInit, Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { TwilioService } from './services/twilio.service';
import { Client } from '@twilio/conversations';
import * as Video from 'twilio-video';
import { UUID } from 'angular2-uuid';
import { SocketService } from './services/socket.service';

import { 
  connect,
  createLocalVideoTrack,
  createLocalAudioTrack,
  RemoteAudioTrack, 
  RemoteParticipant, 
  RemoteTrack, 
  RemoteVideoTrack,
  Room
} from 'twilio-video';


const joinButton = document.querySelector('#join-button') as HTMLButtonElement;
const remoteMediaContainer = document.querySelector('#remote-media-container') as HTMLDivElement;
//const localMediaContainer = document.querySelector('#local-media-container') as HTMLDivElement;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild ('localMediaContainer') localMediaContainer:any;
  @ViewChild ('remoteMediaContainer') remoteMediaContainer:any;
  constructor(
    private twilioService: TwilioService,
    private socketService: SocketService,
    private renderer: Renderer2,
    private el:ElementRef) { }
  ngOnInit(): void {
    this.socketService.connectSocket()
    this.socketService.callAccepted.subscribe((doc:any) => {
      this.loading = false;
      this.userSid = doc.userSid
      this.socketService.userCallAccept(doc);
      this.onJoinClick()
    });
    this.socketService.messageReceived.subscribe((doc:any) => {
      const payload ={
        'msg':doc.msg,
        'agentName':'Test'
      }
      this.messages.push(payload)
    });
 
  }
  conversationToken:any;
  conversationClient:any;
  localParticipant:any;
  conversation:any;
  room:any;
  userSid:any;
  videoToken:any;
  userName:any;
  roomName:any;
  message:any;
  messages:any[]=[];
  videoMode = false;
  audioMode = false;
  chatButton = false;
  title = 'agent-ui';
  public loading = false;
  public videoPublished = false;
  public audioPublished = false;
  UserlocalVideoTrack:any;
  

  getAccessToken(){
    this.chatButton = true;
    //this.loading = true;
    this.roomName = UUID.UUID()
    //this.localParticipant = this.socketService.id;
    const socketObj=this.socketService.getSocket();
    this.localParticipant = socketObj.ioSocket.id;
    this.twilioService.getAccessToken(socketObj.ioSocket.id,this.roomName).subscribe((data:any)=>{
      this.conversationToken = data.conversationRoomAccessToken;
      this.videoToken = data.videoRoomAccessToken;
      const payload ={
        userSid:this.socketService.id,
        roomName: this.roomName,
        conversationSID: data.conversationRoom.sid
      }
      this.initChatClient();
      this.onJoinClick();
      this.socketService.callRequest(payload);
    })
  }

  async initChatClient(){
    this.conversationClient = await new Client(this.conversationToken);
    //const conversation = await this.conversationClient.getSubscribedConversations();
    //this.conversation = conversation.items[0];
    //this.displayMessages()
    // this.conversation.on("messageAdded",(conversation:any)=>{
    //   this.displayMessages()
    // })
  }

  async displayMessages(){
    const messages = await this.conversation.getMessages(1000);
    this.messages = messages.items
  }

  async sendMessage(){
    if( this.message && this.message != ''){
      const payload ={
        "roomName":this.userSid,
        "msg":this.message
      }
      this.socketService.userSendMessage(payload)
      this.messages.push({
        "msg":this.message
      })
      //await this.conversation.sendMessage(this.message);
      this.message = '';
    }
  }
  




  manageTracksForRemoteParticipant(participant: RemoteParticipant) {
    // Handle tracks that this participant has already published.
    this.attachAttachableTracksForRemoteParticipant(participant);

    // Handles tracks that this participant eventually publishes.
    participant.on('trackSubscribed', this.onTrackSubscribed);
    participant.on('trackUnsubscribed', this.onTrackUnsubscribed);
  }

  attachAttachableTracksForRemoteParticipant(participant: RemoteParticipant) {
    participant.tracks.forEach((publication:any) => {
        if (!publication.isSubscribed)
            return;

        if (!this.trackExistsAndIsAttachable(publication.track))
            return;

        this.attachTrack(publication.track);
    });
  }

  onTrackSubscribed(track: RemoteTrack) {
    console.log(track)
    if (!this.trackExistsAndIsAttachable(track))
        return;

    this.attachTrack(track);
  }

  attachTrack(track: RemoteAudioTrack | RemoteVideoTrack) {
    const videoElement = track.attach();
    this.renderer.setStyle(videoElement, 'height', '100%');
    this.renderer.setStyle(videoElement, 'width', '100%');
    this.renderer.setStyle(videoElement, 'position', 'absolute');
    this.renderer.setStyle(videoElement, 'object-fit', 'cover');
    this.renderer.setStyle(videoElement, 'z-index', '0');
    this.renderer.setStyle(videoElement, 'left', '0px');
    this.renderer.appendChild(this.remoteMediaContainer.nativeElement, videoElement);
  }

  onTrackUnsubscribed(track: RemoteTrack) {
    if (this.trackExistsAndIsAttachable(track))
        track.detach().forEach(element => element.remove());
  }

  trackExistsAndIsAttachable(track?: any): track is RemoteAudioTrack | RemoteVideoTrack {
    return !!track && (
        (track as RemoteAudioTrack).attach !== undefined ||
        (track as RemoteVideoTrack).attach !== undefined
    );
  }

  async onJoinClick() {
    //joinButton.disabled = true;
    //this.localVideoTrack()

     await connect(this.videoToken, {
        name: this.roomName,
        audio: false,
        video: false
    }).then(room => {
      console.log(`Successfully joined a Room: ${room.localParticipant}`);
      this.room = room;

      room.participants.forEach(
        participant => this.manageTracksForRemoteParticipant(participant)
      );
      this.room.on('disconnected', (room:any) => {
        room.localParticipant.tracks.forEach((publication:any) => {
          const attachedElements = publication.track.detach();
          attachedElements.forEach((element:any) => element.remove());
        });
      });
    
      this.room.on('participantConnected', (participant:any) => {
        //this.loading = false;
        console.log(`A remote Participant connected: ${participant}`);
        participant.tracks.forEach((publication:any) => {
          if (publication.isSubscribed) {
            const track:any = publication.track;
            this.attachTrack(track)
          }
        });

        participant.on('trackSubscribed', (track:any) => {
          this.attachTrack(track)
        });
      });
    }, error => {
      console.error(`Unable to connect to Room: ${error.message}`);
    });
  }
  videoElement:any
  async localVideoTrack(localVideoTrack:any) {
    // Provides a camera preview window.
    
    this.videoElement = localVideoTrack.attach();
    this.renderer.setStyle(this.videoElement, 'height', '130px');
    this.renderer.setStyle(this.videoElement, 'width', '130px');
    this.renderer.setStyle(this.videoElement, 'position', 'absolute');
    this.renderer.setStyle(this.videoElement, 'left', '20px');
    this.renderer.setStyle(this.videoElement, 'top', '30px');
    this.renderer.setStyle(this.videoElement, 'z-index', '1');
    this.renderer.appendChild(this.localMediaContainer.nativeElement, this.videoElement);
  }

  muteVideo(){
    this.videoMode = false;
    this.room.localParticipant.videoTracks.forEach((publication:any) => {
      publication.track.disable();
     // publication.unpublish();
    });
    this.renderer.removeChild(this.localMediaContainer.nativeElement, this.videoElement)
  }

  muteAudio(){
    this.audioMode = false;
    this.room.localParticipant.audioTracks.forEach((publication:any) => {
      publication.track.disable();
    });
  }

  async unMuteVideo(){

    this.videoMode = true;
    let localVideoTrack = await createLocalVideoTrack();
    this.localVideoTrack(localVideoTrack);

    if(this.videoPublished === false) {

      console.log("going to publish video")
      this.room.localParticipant.publishTrack(localVideoTrack, {
        priority: 'high'
      })
      this.videoPublished = true;
    }
    else {
      this.room.localParticipant.videoTracks.forEach((track:any) => {
        track.track.enable();
      });
    }
    
  }

  async unMuteAudio(){
    this.audioMode = true;
    
    if(this.audioPublished === false) {

     /*  const options = new CreateLocalAudioTrackOptions({
        deviceId: 'default',
        enable: true,
        name: 'user audio track'
      });
      */
      let localAudioTrack = await createLocalAudioTrack({});

    
      console.log("going to publish video")
      this.room.localParticipant.publishTrack(localAudioTrack, {
        priority: 'high'
      })
      this.audioPublished = true;
    }
    else {
      this.room.localParticipant.audioTracks.forEach((publication:any) => {
        publication.track.enable();
      });
    }
  }

  removeParticipant(){
    this.room.disconnect();
    this.chatButton = false;
  }
}