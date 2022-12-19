import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable, Observer } from 'rxjs';
import { map } from 'rxjs/operators';
@Injectable({
  providedIn: 'root'
})
export class SocketService {
  id:any;
  callAccepted = this.socket.fromEvent('CallRequestAccepted');
  constructor(private socket: Socket) { }
  connectSocket() {
    this.socket.emit('Connected');
    const obj:Socket =this.socket;
    setTimeout(()=>{
      this.id =obj.ioSocket.id
    },3000)

  }

  callRequest(obj:any){
    this.socket.emit('CallRequest',obj);
  }

  userCallAccept(obj:any){
    this.socket.emit('UserCallAccept',obj);
  }
}
