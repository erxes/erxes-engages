import { Document, Model, model, Schema } from 'mongoose';

export interface ILog {
  engageMessageId: string;
  message: string;
}

export interface ILogDocument extends ILog, Document {}

export interface ILogModel extends Model<ILogDocument> {
  createLog(engageMessageId: string, message: string): Promise<void>;
}

export const logSchema = new Schema({
  engageMessageId: { type: String },
  message: { type: String },
});

export const loadLogClass = () => {
  class Log {
    public static async createLog(engageMessageId: string, message: string) {
      return Logs.create({ engageMessageId, message });
    }
  }

  logSchema.loadClass(Log);

  return logSchema;
};

loadLogClass();

// tslint:disable-next-line
const Logs = model<ILogDocument, ILogModel>('engage_logs', logSchema);

export default Logs;
