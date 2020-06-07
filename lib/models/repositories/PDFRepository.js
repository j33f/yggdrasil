'use strict';

const
  FilesRepository = require('./FilesRepository'),
  Bluebird = require('bluebird'),
  pug = require('pug'),
  Docxtemplater = require('docxtemplater'),
  ImageModule = require('docxtemplater-image-module'),
  JSZip = require('jszip'),
  { lstatSync, readdirSync, readFile, readFileSync, writeFile, unlink } = require('fs'),
  { basename, join, resolve } = require('path');

const getDirectories = source => readdirSync(source).filter(name => lstatSync(join(source, name)).isDirectory()).map(name => basename(name));
const
  read = Bluebird.promisify(readFile),
  write = Bluebird.promisify(writeFile),
  del = Bluebird.promisify(unlink);

class PDFRepository extends FilesRepository {

  constructor(yggdrasil) {
    const templatesList = getDirectories(resolve(join(__dirname, '..', 'pdfTemplates')));

    super(yggdrasil, 'PDF');

    this.browser = yggdrasil.browser;

    this.pugTemplates = {};
    this.docxTemplates = {};

    // compile each template
    templatesList.forEach(tplName => {
      try {
        this.pugTemplates[tplName] = pug.compileFile(join(__dirname, '..', 'pdfTemplates', tplName, 'index.pug'));
        yggdrasil.logger.info('✅ [PDF Repository] PUG Template "' + tplName + '" compiled');
      } catch(e) {

        try {
          if (lstatSync(join(__dirname, '..', 'pdfTemplates', tplName, 'template.docx')).isFile()) {
            this.docxTemplates[tplName] = join(__dirname, '..', 'pdfTemplates', tplName, 'template.docx');
            yggdrasil.logger.info('✅ [PDF Repository] DOCX Template "' + tplName + '" found');
          } else {
            throw new Error('NOENT');
          }
        } catch (ee) {
          yggdrasil.logger.info('❌ The PDF template named "' + tplName + '" is nor a PUG or a DOCX template');

        }
      }
    });
  }

  /**
   * Generate the PDF and save it into the local filesystem and database
   * @param templateName<string> : the name of the template located in /models/pdfTemplates/{template name}/index.pug
   * @param payload<object> : the vars to be used to control the template behavior and content
   * @param path<string|undefined> : the path where to store the pdf file
   * @returns {string} : the path of the generated pdf
   */
  generatePUG(templateName, payload, path) {
    let page, rendered;

    path = path || join('/tmp', this.yggdrasil.uuid(true));
    payload = payload || {};

    return Bluebird.resolve()
      .then(() => {
        // use the template and the payload to create the html document
        try {
          if (this.pugTemplates[templateName]) {
            rendered = this.pugTemplates[templateName](payload);
          } else {
            return Bluebird.reject(new Error('The template "' + templateName + '" does not exists'));
          }
        } catch (e) {
          console.log(e);
          return Bluebird.reject(new Error('The template "' + templateName + '" does not exists or includes errors'));
        }

        return Bluebird.resolve();
      })
      .then(() => this.browser.newPage())
      .then(p => {
        page = p;
      })
      .then(() => page.setContent(rendered))
      .then(() => page.pdf({
        path: path,
        displayHeaderFooter: false
      }))
      .then(() => page.close())
      .then(() => Bluebird.resolve(path));
  }

  generateDOCX(templateName, payload, path) {
    const tmpPath = join('/tmp', this.yggdrasil.uuid(true) + '.docx');
    const targetPath = path || join('/tmp', this.yggdrasil.uuid(true) + '.pdf');

    return read(this.docxTemplates[templateName], 'binary')
      .then(docx => new JSZip(docx))
      .then(template => {
        let imageModule, imageModuleOps = {};
        let doc = new Docxtemplater();

        if (payload.haveImages) {
          imageModuleOps.getImage = (tagValue) => {
            return readFileSync(tagValue, 'binary');
          };
          imageModuleOps.getSize = () => {
            //const sizeObj = imageSize(img);
            //return [sizeObj.width, sizeObj.height];
            return [300,300];
          };
          imageModule = new ImageModule(imageModuleOps);
          doc.attachModule(imageModule);
        }

        doc.setOptions({linebreaks:true});
        doc.loadZip(template);
        doc.setData(payload);
        try {
          doc.render();
        } catch (e) {
          this.yggdrasil.logger.error(e.properties);
          return Bluebird.reject(e);
        }
        return Bluebird.resolve(doc);
      })
      .then(rendered => {
        return write(tmpPath, rendered.getZip().generate({type: 'nodebuffer'}));
      })
      .then(() => {
        try {
          return this.yggdrasil.lib.drivers.unoconv(this.yggdrasil, tmpPath, false, targetPath, 'docx');
        } catch(e) {
          return Bluebird.reject(e);
        }
      })
      .then(() => {
        return del(tmpPath);
      })
      .then(() => {
        return Bluebird.resolve(targetPath);
      });
  }

  generateAndSet (templateName, metadata, payload) {
    const
      metas = {
        displayName: metadata.displayName + '.pdf' || this.yggdrasil.uuid(true) + '.pdf',
        mimeType: 'yggdrasillication/pdf',
        userId: metadata.userId || null,
        description: metadata.description || null,
        type: metadata.type || 'misc-pdf',
        shared: metadata.shared || false
      };

    if (this.pugTemplates[templateName]) {
      return this.generatePUG(templateName, payload, join(this.yggdrasil.config.fileStorage.path, metas.displayName))
        .then(() => super.setFromLocalFile(this.yggdrasil.uuid(), metas))
        .then(lastMeta => Bluebird.resolve(lastMeta));
    } else if (this.docxTemplates[templateName]) {
      return this.generateDOCX(templateName, payload, join(this.yggdrasil.config.fileStorage.path, metas.displayName))
        .then(() => super.setFromLocalFile(this.yggdrasil.uuid(), metas))
        .then(lastMeta => Bluebird.resolve(lastMeta));
    }

    return Bluebird.reject(new Error('This template noes not exists at all: ' + templateName));
  }

  generate (templateName, payload) {
    if (this.pugTemplates[templateName]) {
      return this.generatePUG(templateName, payload);
    } else if (this.docxTemplates[templateName]) {
      return this.generateDOCX(templateName, payload);
    }
    return Bluebird.reject(new Error('This template noes not exists at all: ' + templateName));
  }
}

module.exports = PDFRepository;
