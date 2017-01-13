'use strict';

const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const {md5, randomFileName} = require('./utils');
const CRLF = '\r\n';

const ReduceFormData = function(options, jsonHeader){
  this.header = jsonHeader;
  this.length = this.header['content-length'] || 0;
  this.tempPath = options.tempPath;
  this.formData = {};
  this.reducedData = {};
  this.files = [];
  this.__fileBuffers = [];
  this.__fileBuffersSaving = false;
  this.__cursor = 0; // cursor of field
  this.__bound = 0; // bound of field
  this.__truncBoundary; // Latest truncated boundary
  this.__truncHeader; // Latest truncated header
  this.__truncFileName; // Latest truncated file
  this.init();
};

ReduceFormData.prototype.init = function(){
  let contentType = querystring.parse(this.header['content-type'] || '', '; ');
  this.isMultipart = 'multipart/form-data' in contentType;
  this.boundary = contentType.boundary || '';
  this.boundaryLength = this.boundary.length;
};

ReduceFormData.prototype.toString = function(){
  return querystring.stringify(this.reducedData);
};

ReduceFormData.prototype.feed = function(buf){
  this.__buffer = buf;
  this.recvLength = buf.length;
  if (!this.isMultipart) {
    let objData = querystring.parse(buf.toString());
    for (let n in objData) {
      this.formData[n] = objData[n];
      this.reducedData[n] = this.reduce(objData[n]);
    }
  } else {
    this.parseMultipartData(buf);
  }
};

ReduceFormData.prototype.saveFileBuffer = function(){
  if (this.__fileBuffersSaving) return;
  let saveFile = file => {
    fs.open(path.resolve(this.tempPath, file.filename), 'a', (err, fd)=>{
      fs.write(fd, file.buffer, 0, file.buffer.length, ()=>{
        if (this.__fileBuffers[0]) {
          saveFile(this.__fileBuffers.shift());
        } else {
          this.__fileBuffersSaving = false;
        }
        fs.close(fd);
      });
    });
  };
  if (this.__fileBuffers[0]) {
    saveFile(this.__fileBuffers.shift());
  } else {
    this.__fileBuffersSaving = false;
  }
};

ReduceFormData.prototype.moveNextField = function() {
  let start = this.__cursor < 0 ? this.__cursor : this.__buffer.indexOf('--', this.__cursor) + 2;
  let cursor = start + this.boundaryLength;
  let tmp = this.__buffer.toString('ascii', start, cursor);
  if (tmp === this.boundary || // found boundary
    this.boundary.indexOf(tmp)>0 && this.boundary===this.__truncBoundary+tmp // Last half of truncated boundary
  ) {
    let bound = this.__buffer.indexOf('--', cursor);
    if (this.__buffer.toString('ascii', bound + 2, bound+this.boundaryLength + 2)===this.boundary) {
      this.__bound = bound - 2; // cut CRLF
    } else {
      this.__bound = this.recvLength;
    }
    this.__cursor = cursor;
    this.__truncBoundary = '';
    return true;
  } else if (this.boundary.indexOf(tmp)===0) { // First half of truncated boundary
    this.__cursor = - tmp.length;
    this.__truncBoundary = tmp;
    return false;
  } else if (this.__cursor===0) { // All buffer is next part of truncated data
    this.__cursor = -2;
    this.__bound = this.recvLength;
    return true;
  } else {
    this.__cursor = 0;
    return false;
  }
};

ReduceFormData.prototype.parseMultipartData = function() {
  while (this.moveNextField()) {
    let cursor = this.__cursor + 2, header, headerBound, buf;
    if (cursor===0) { // All buffer is next part of truncated data
      if (this.__truncHeader) { // has truncated header
        headerBound = this.__buffer.indexOf(CRLF + CRLF, cursor);
        header = this.__truncHeader + this.__buffer.toString('ascii', cursor, headerBound);
        this.__truncHeader = '';
      } else {
        if (this.__truncFileName) {
          this.__fileBuffers.push({filename: this.__truncFileName, buffer : this.__buffer});
        }
        continue;
      }
    } else {
      headerBound = this.__buffer.indexOf(CRLF + CRLF, cursor);
      if (headerBound < 0) { // truncated header
        this.__truncHeader = this.__buffer.toString('ascii', cursor);
        continue;
      } else {
        header = this.__buffer.toString('ascii', cursor, headerBound);
      }
    }

    // checkout data
    let head = querystring.parse(header, CRLF, ': '), cd = querystring.parse(head['Content-Disposition'], '; '),
      name = cd.name.slice(1, -1), filename, filetype, entity;

    cursor = headerBound + 4; // skip double CRLF
    if (cd.filename) { // file's field
      let tmpFileName = randomFileName(22);
      filename = cd.filename.slice(1, -1);
      filetype = head['Content-Type'];
      this.files.push({name, filename, filetype, tmpFileName});
      this.__truncFileName = tmpFileName;
      entity = this.__buffer.toString('base64', cursor, this.__bound - cursor > 2048 ? cursor + 2048 : this.__bound);
      buf = Buffer.allocUnsafe(this.__bound - cursor).fill('!');
      this.__buffer.copy(buf, 0, cursor);
      this.__fileBuffers.push({filename: tmpFileName, buffer : buf});
    } else {
      this.__truncFileName = null;
      entity = this.__buffer.toString('utf8', cursor, this.__bound);
      this.formData[name] = entity;
    }
    this.reducedData[name] = this.reduce(entity);
  };
};

ReduceFormData.prototype.reduce = function(data) {
  return data.lenght < 17 ? data : '~' + md5(data).substring(15);
};

module.exports = ReduceFormData;