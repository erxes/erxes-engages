import { Document, Model, model, Schema } from 'mongoose';

const STATUS = {
  VALID: 'valid',
  INVALID: 'invalid',
  ALL: ['valid', 'invalid'],
};

interface IEmail {
  email: string;
  status: string;
  created: Date;
}

interface IEmailDocument extends IEmail, Document {
  _id: string;
}

const emailSchema = new Schema({
  email: { type: String, unique: true },
  status: { type: String, enum: STATUS.ALL },
  created: Date,
});

interface IEmailModel extends Model<IEmailDocument> {
  createEmail(doc: IEmail): Promise<IEmailDocument>;
}

export const loadClass = () => {
  class Email {
    public static createEmail(doc: IEmail) {
      return Emails.create(doc);
    }
  }

  emailSchema.loadClass(Email);
};

loadClass();

// tslint:disable-next-line
const Emails = model<IEmailDocument, IEmailModel>('emails', emailSchema);

export default Emails;
