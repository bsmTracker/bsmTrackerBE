import * as multer from 'multer';

import * as path from 'path';

import * as fs from 'fs';

import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';

const createFolder = (folder: string) => {
  try {
    fs.mkdirSync(path.join(__dirname, '..', `uploads`)); //폴더를 만드는 명령어
  } catch (error) {}

  try {
    fs.mkdirSync(path.join(__dirname, '..', `uploads/${folder}`)); //폴더 생성
  } catch (error) {}
};

const storage = (
  folder: string,
  allowedExtensions?: string[],
): multer.StorageEngine => {
  createFolder(folder); // 폴더 만들고
  return multer.diskStorage({
    //옵션을 써준다.
    destination(req, file, cb) {
      //* 어디에 저장할 지
      const folderName = path.join(__dirname, '..', `uploads/${folder}`);
      cb(null, folderName); //cb에 두번째 인자가 어디에 저장할지다.
    },
    filename(req, file, cb) {
      //* 어떤 이름으로 올릴 지
      const ext = path.extname(file.originalname);
      if (
        allowedExtensions.length === 0 ||
        allowedExtensions.includes(ext.toLowerCase().replace('.', ''))
      ) {
        // 허용된 확장자인지 확인
        const fileName = `${path.basename(
          file.originalname,
          ext,
        )}${Date.now()}${ext}`;
        cb(null, fileName);
      } else {
        cb(
          new BadRequestException(
            `확장자가 올바르지 않습니다 (허용된 확장자에 맞추어 보내세요)`,
          ),
          null,
        );
      }
    },
  });
};
//multerOptions을 컨트롤러에서 사용해서 업로드 한다.
export const multerOptions = (
  folder: string,
  allowedExtensions: string[],
  directSave: boolean,
) => {
  const result: MulterOptions = {
    storage: directSave
      ? storage(folder, allowedExtensions)
      : multer.memoryStorage(),
  };
  return result;
};
