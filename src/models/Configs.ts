import { Document, Model, model, Schema } from 'mongoose';

export interface IConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface IConfigDocument extends IConfig, Document {}

export const configsSchema = new Schema({
  _id: { type: String },
  accessKeyId: { type: String },
  secretAccessKey: { type: String },
  region: { type: String },
});

export interface IConfigModel extends Model<IConfigDocument> {
  updateConfig(doc: IConfig): Promise<IConfigDocument>;
}

export const configIdByDefault = 'config';

export const loadClass = () => {
  class Config {
    /**
     * Updates config
     */
    public static async updateConfig(doc: IConfig) {
      const config = await Configs.findOne({ _id: configIdByDefault });

      if (!config) {
        return Configs.create({ ...doc, _id: configIdByDefault });
      }

      if (config) {
        await Configs.updateOne({ _id: configIdByDefault }, { $set: { ...doc } });

        return Configs.findOne({ _id: configIdByDefault });
      }
    }
  }

  configsSchema.loadClass(Config);

  return configsSchema;
};

loadClass();

// tslint:disable-next-line
const Configs = model<IConfigDocument, IConfigModel>('configs', configsSchema);

export default Configs;
