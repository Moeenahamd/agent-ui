import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
@Injectable({
  providedIn: 'root'
})
export class TwilioService {

  baseUrl = 'http://localhost:5000';
  constructor(private http: HttpClient) { }
  getAccessToken(userName:any, roomName:any) {
    const obj ={
      "userName": userName,
      "roomName": roomName
    }
    return this.http.post('http://134.122.28.251:3001/userRoutes/conversationAndVideoRoom',obj);
  }
}