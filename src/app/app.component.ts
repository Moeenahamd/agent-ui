import { AfterViewInit, Component, OnInit, Renderer2, ViewChild } from '@angular/core';
import { TwilioService } from './services/twilio.service';
import { Client } from '@twilio/conversations';
import * as Video from 'twilio-video';
import { UUID } from 'angular2-uuid';
import { SocketService } from './services/socket.service';

import { 
  connect,
  createLocalVideoTrack,
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
    private renderer: Renderer2) { }
  ngOnInit(): void {
    this.socketService.connectSocket()
    this.socketService.callAccepted.subscribe((doc:any) => {
      this.loading = false;
      this.socketService.userCallAccept(doc);
      this.onJoinClick()
    });
 
  }
  conversationToken:any;
  conversationClient:any;
  localParticipant:any;
  conversation:any;
  room:any;
  videoToken:any;
  userName:any;
  roomName:any;
  message:any;
  messages:any;
  title = 'agent-ui';
  public loading = false;
  

  getAccessToken(){
    this.loading = true;
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
    const conversation = await this.conversationClient.getSubscribedConversations();
    this.conversation = conversation.items[0];
    this.displayMessages()
    this.conversation.on("messageAdded",(conversation:any)=>{
      this.displayMessages()
    })
  }

  async displayMessages(){
    const messages = await this.conversation.getMessages(1000);
    console.log(messages.items)
    this.messages = messages.items
  }

  async sendMessage(){
    if( this.message && this.message != ''){
      await this.conversation.sendMessage(this.message);
      this.message = '';
      //console.log(this.localParticipant)
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



  async  onJoinClick() {
    //joinButton.disabled = true;
    this.localVideoTrack()

    const room = await connect(this.videoToken, {
        name: 'room-name',
        audio: true,
        video: { width: 640 }
    }).then(room => {
      console.log(`Successfully joined a Room: ${room.localParticipant}`);

      room.participants.forEach(
        participant => this.manageTracksForRemoteParticipant(participant)
    );

      room.on('participantConnected', participant => {
        //this.loading = false;
        console.log(`A remote Participant connected: ${participant}`);
        participant.tracks.forEach(publication => {
          if (publication.isSubscribed) {
            const track:any = publication.track;
            this.attachTrack(track)
            //document.getElementById('remote-media-div').appendChild(track.attach());
          }
        });

        participant.on('trackSubscribed', (track:any) => {
          //this.loading = false;

          this.attachTrack(track)
          //document.getElementById('remote-media-div').appendChild(track.attach());
        });
      });
    }, error => {
      console.error(`Unable to connect to Room: ${error.message}`);
    });
  }
  
  async  localVideoTrack() {
    // Provides a camera preview window.
    const localVideoTrack = await createLocalVideoTrack({ width: 640 });
    const videoElement = localVideoTrack.attach();
    this.renderer.setStyle(videoElement, 'height', '150px');
    this.renderer.setStyle(videoElement, 'width', '150px');
    this.renderer.setStyle(videoElement, 'position', 'absolute');
    this.renderer.setStyle(videoElement, 'left', '20px');
    this.renderer.setStyle(videoElement, 'top', '30px');
    this.renderer.setStyle(videoElement, 'z-index', '1');
    this.renderer.appendChild(this.localMediaContainer.nativeElement, videoElement);
  }

  
}
