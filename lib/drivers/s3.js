'use strict';
const AWS = require('aws-sdk');

class S3 {
  constructor(yggdrasil, config, bucket, prefix, AWSLib) {
    this.yggdrasil = yggdrasil;
    this.config = config;
    this.bucket = bucket || config.bucket;
    this.prefix = prefix || config.prefix ||'';
    this.endpoint = this.config.endpoint;
    this.AWS = AWSLib || AWS;

    const awsOptions = {
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      region: this.config.region,
      s3BucketEndpoint: Boolean(this.endpoint),
    };
    if (this.endpoint) {
      awsOptions.endpoint = this.endpoint
    }
    if (this.endpoint.match(/^http:/)) {
      awsOptions.http = {verify: false};
    }

    this.awsConfig = new this.AWS.Config(awsOptions);
    this.s3 = new this.AWS.S3(this.awsConfig);
  }

  /**
   * Get S3 url for key
   * @param key {string} - S3 key
   * @param isPublic {boolean} - Is the file public
   * @return {string|*}
   */
  getUrl(key, isPublic = false) {
    const _key = this.prefix + key;
    if (isPublic) {
      return `https://${this.bucket}.${this.endpoint.replace(/^https?:\/\//, '')}/${_key}`;
    }
    return this.s3.getSignedUrl('getObject', {
      Bucket: this.bucket,
      Key: key,
      Expires: 60
    });
  }

  /**
   * Upload file to S3
   * @param body {Buffer, TypedArray, Blob, string, stream} - File body
   * @param key {string} - S3 key
   * @param contentType {string} - Content Type
   * @param isPublic {boolean} - Is the file public (default: false)
   * @param encrypt {boolean} - Encrypt the file ? (default: false)
   * @return {Promise<{url: string}>}
   */
  set(body, key, contentType, isPublic = false, encrypt = false) {
    const params = {
      Bucket: this.bucket,
      Key: this.prefix + key,
      Body: body,
      ACL: isPublic ? 'public-read' : 'private',
      ContentType: contentType || 'application/octect-stream',
      ServerSideEncryption: encrypt ? 'AES256' : undefined
    };

    return this.s3.putObject(params).promise()
      .then(() => {
        return {
          url: this.getUrl(key, isPublic)
        };
      });
  }

  /**
   * Get file from S3
   * @param key {string} - S3 key
   * @return {Promise<{}>} - The file body is into {Body: {Buffer, stream}}
   */
  get(key) {
    const params = {
      Bucket: this.bucket,
      Key: this.prefix + key
    };

    return this.s3.getObject(params).promise();
  }

  /**
   * Delete a file from S3
   * @param key {string, Array} - S3 key(s)
   * @return {Promise<{}>}
   */
  delete(key) {
    let params = {};
    if (Array.isArray(key)) {
      params = {
        Bucket: this.bucket,
        Delete: {
          Objects: key.map(k => ({Key: this.prefix + k}))
        }
      };
      return this.s3.deleteObjects(params).promise();
    }

    params = {
      Bucket: this.bucket,
      Key: this.prefix + key
    };

    return this.s3.deleteObject(params).promise();
  }
}

module.exports = S3;
