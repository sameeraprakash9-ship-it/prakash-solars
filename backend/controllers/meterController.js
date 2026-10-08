const Meter = require('../models/Meter');
const Reading = require('../models/Reading');

const solarProfileFields = [
  'solarPanelBrand',
  'solarPanelModel',
  'solarPanelCount',
  'solarInstallationYear',
  'solarDescription',
  'solarPhotos',
  'solarPhotoData',
  'solarPhotoContentType'
];
const maximumPhotoBytes = 700 * 1024;
const maximumPhotoCount = 5;

const validateSolarPhoto = photo => {
  if (!photo || typeof photo.data !== 'string' ||
      !/^(image\/jpeg|image\/png|image\/webp)$/.test(photo.contentType || '')) {
    return { error: 'Choose JPEG, PNG, or WebP solar panel photos' };
  }

  const bytes = Buffer.from(photo.data, 'base64');
  if (!bytes.length || bytes.toString('base64') !== photo.data)
    return { error: 'Solar panel photos must be valid images' };

  const isJpeg = photo.contentType === 'image/jpeg' &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = photo.contentType === 'image/png' &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = photo.contentType === 'image/webp' &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!isJpeg && !isPng && !isWebp)
    return { error: 'A selected photo does not match its image type' };

  return { bytes };
};

const normalizeSolarProfile = body => {
  const profile = {};
  for (const field of solarProfileFields) {
    if (Object.prototype.hasOwnProperty.call(body, field))
      profile[field] = body[field];
  }

  for (const field of ['solarPanelBrand', 'solarPanelModel', 'solarDescription']) {
    if (profile[field] !== undefined && profile[field] !== '') {
      if (typeof profile[field] !== 'string')
        return { error: `${field} must be text` };
      profile[field] = profile[field].trim();
    } else if (profile[field] === '') {
      profile[field] = undefined;
    }
  }

  if (profile.solarPanelCount !== undefined && profile.solarPanelCount !== '') {
    profile.solarPanelCount = Number(profile.solarPanelCount);
    if (!Number.isInteger(profile.solarPanelCount) || profile.solarPanelCount < 1 || profile.solarPanelCount > 10000)
      return { error: 'Solar panel count must be an integer between 1 and 10000' };
  } else if (profile.solarPanelCount === '') {
    profile.solarPanelCount = undefined;
  }

  if (profile.solarInstallationYear !== undefined && profile.solarInstallationYear !== '') {
    profile.solarInstallationYear = Number(profile.solarInstallationYear);
    if (!Number.isInteger(profile.solarInstallationYear) || profile.solarInstallationYear < 1950 || profile.solarInstallationYear > new Date().getFullYear())
      return { error: 'Solar installation year must be a valid year no later than this year' };
  } else if (profile.solarInstallationYear === '') {
    profile.solarInstallationYear = undefined;
  }

  let photos;
  if (profile.solarPhotos !== undefined) {
    if (!Array.isArray(profile.solarPhotos) || profile.solarPhotos.length > maximumPhotoCount)
      return { error: `Upload no more than ${maximumPhotoCount} solar panel photos` };
    if (
      profile.solarPhotoData !== undefined ||
      profile.solarPhotoContentType !== undefined
    ) {
      return { error: 'Provide either solarPhotos or a single solar photo, not both' };
    }

    photos = [];
    let totalBytes = 0;
    for (const photo of profile.solarPhotos) {
      const checked = validateSolarPhoto(photo);
      if (checked.error) return checked;
      totalBytes += checked.bytes.length;
      if (totalBytes > maximumPhotoBytes)
        return { error: 'Your solar photos together must be smaller than 700 KB. Choose fewer or smaller photos.' };
      photos.push({ data: photo.data, contentType: photo.contentType });
    }
    delete profile.solarPhotos;
  }

  if (profile.solarPhotoData !== undefined || profile.solarPhotoContentType !== undefined) {
    const { solarPhotoData, solarPhotoContentType } = profile;
    if (!solarPhotoData && !solarPhotoContentType) {
      profile.solarPhotoData = undefined;
      profile.solarPhotoContentType = undefined;
    } else {
      const checked = validateSolarPhoto({
        data: solarPhotoData,
        contentType: solarPhotoContentType
      });
      if (checked.error) return checked;
      if (checked.bytes.length > maximumPhotoBytes)
        return { error: 'Solar photos must be smaller than 700 KB' };
    }
  }

  return { profile, photos };
};

const hasSolarProfile = (profile, photos) =>
  photos !== undefined || solarProfileFields.some(field => profile[field] !== undefined);

const validateSolarProfileForMeter = (meterType, profile, photos) =>
  meterType === 'generation' || !hasSolarProfile(profile, photos)
    ? null
    : 'Solar panel details can only be added to a generation meter';

// helper: meter must belong to the user (admin can access all)
const getOwnMeter = async (req, res) => {
  const meter = await Meter.findById(req.params.id);
  if (!meter) { res.status(404).json({ message: 'Meter not found' }); return null; }
  if (req.user.role !== 'admin' && !meter.owner.equals(req.user._id)) {
    res.status(403).json({ message: 'Not your meter' }); return null;
  }
  return meter;
};

const rangeMatch = (meterId, from, to) => {
  const match = { meter: meterId };
  if (from || to) match.timestamp = { ...(from && { $gte: new Date(from) }), ...(to && { $lte: new Date(to) }) };
  return match;
};

// 1. POST /meters
exports.createMeter = async (req, res, next) => {
  try {
    const { serialNo, type, capacityKw, zone } = req.body;
    if (req.user.role === 'consumer' && type !== 'consumption')
      return res.status(400).json({ message: 'Consumers can only register consumption meters' });
    const { profile, photos, error } = normalizeSolarProfile(req.body);
    if (error) return res.status(400).json({ message: error });
    const profileError = validateSolarProfileForMeter(type, profile, photos);
    if (profileError) return res.status(400).json({ message: profileError });
    if (photos !== undefined) {
      profile.solarPhotos = photos;
      profile.solarPhotoData = undefined;
      profile.solarPhotoContentType = undefined;
    }
    const meter = await Meter.create({
      owner: req.user._id,
      serialNo,
      type,
      capacityKw,
      zone: zone || req.user.zone,
      ...profile
    });
    res.status(201).json(meter);
  } catch (e) { next(e); }
};

// 2. GET /meters
exports.listMeters = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { owner: req.user._id };
    res.json(await Meter.find(filter).sort('-createdAt'));
  } catch (e) { next(e); }
};

exports.updateSolarProfile = async (req, res, next) => {
  try {
    const body = req.body || {};
    const fields = Object.keys(body);
    if (!fields.length || fields.some(field => !solarProfileFields.includes(field))) {
      return res.status(400).json({
        message: `Provide one or more solar profile fields: ${solarProfileFields.join(', ')}`
      });
    }

    const meter = await getOwnMeter(req, res);
    if (!meter) return;
    if (req.user.role !== 'prosumer' || meter.type !== 'generation')
      return res.status(403).json({ message: 'Only the prosumer who owns a generation meter can edit its solar profile' });

    const { profile, photos, error } = normalizeSolarProfile(body);
    if (error) return res.status(400).json({ message: error });
    const fieldsToSet = Object.fromEntries(
      Object.entries(profile).filter(([, value]) => value !== undefined)
    );
    const fieldsToClear = Object.keys(profile).filter(field => profile[field] === undefined);
    if (photos !== undefined) {
      fieldsToSet.solarPhotos = photos;
      fieldsToClear.push('solarPhotoData', 'solarPhotoContentType');
    }
    const update = {};
    if (Object.keys(fieldsToSet).length) update.$set = fieldsToSet;
    if (fieldsToClear.length) update.$unset = Object.fromEntries(fieldsToClear.map(field => [field, 1]));
    const result = await Meter.findByIdAndUpdate(
      meter._id,
      update,
      { new: true, runValidators: true }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getSolarPhoto = async (req, res, next) => {
  try {
    const requestedIndex = req.params.index === undefined ? 0 : Number(req.params.index);
    if (!Number.isInteger(requestedIndex) || requestedIndex < 0 || requestedIndex >= maximumPhotoCount)
      return res.status(400).json({ message: 'Invalid solar panel photo number' });

    const meter = await Meter.findById(req.params.id).select(
      '+solarPhotoData +solarPhotos.data solarPhotos.contentType solarPhotoContentType'
    );
    const galleryPhoto = meter?.solarPhotos?.[requestedIndex];
    const legacyPhoto = requestedIndex === 0 && meter?.solarPhotoData
      ? { data: meter.solarPhotoData, contentType: meter.solarPhotoContentType }
      : null;
    const photo = galleryPhoto || legacyPhoto;
    if (!photo)
      return res.status(404).json({ message: 'Solar panel photo not found' });

    res.set({
      'Content-Type': photo.contentType,
      'Content-Length': String(Buffer.byteLength(photo.data, 'base64')),
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff'
    });
    res.send(Buffer.from(photo.data, 'base64'));
  } catch (error) {
    next(error);
  }
};

// 3. POST /meters/:id/readings
exports.addReading = async (req, res, next) => {
  try {
    const meter = await getOwnMeter(req, res); if (!meter) return;
    const { generatedKwh = 0, consumedKwh = 0, timestamp } = req.body;
    if (meter.type === 'generation' && consumedKwh > 0) return res.status(400).json({ message: 'Generation meter cannot record consumption' });
    if (meter.type === 'consumption' && generatedKwh > 0) return res.status(400).json({ message: 'Consumption meter cannot record generation' });
    const reading = await Reading.create({ meter: meter._id, generatedKwh, consumedKwh, timestamp: timestamp ? new Date(timestamp) : new Date() });
    res.status(201).json(reading);
  } catch (e) { next(e); }
};

// 4. POST /meters/:id/simulate   body: { date: "2026-10-04", weather: 0.2-1 (optional) }
exports.simulate = async (req, res, next) => {
  try {
    const meter = await getOwnMeter(req, res); if (!meter) return;
    const { date, weather: requestedWeather } = req.body || {};
    const day = date ? new Date(date) : new Date();
    if (Number.isNaN(day.getTime()))
      return res.status(400).json({ message: 'Invalid date' });
    day.setUTCHours(0, 0, 0, 0);
    const weather = requestedWeather === undefined
      ? 0.6 + Math.random() * 0.4
      : Number(requestedWeather);
    if (!Number.isFinite(weather) || weather < 0.2 || weather > 1)
      return res.status(400).json({ message: 'Weather must be between 0.2 and 1' });
    const ops = [];
    for (let h = 0; h < 24; h++) {
      const solarShape = h >= 6 && h <= 18 ? Math.sin((Math.PI * (h - 6)) / 12) : 0;   // bell curve, peak at noon
      const generated = meter.type === 'consumption' ? 0 : +(meter.capacityKw * solarShape * weather).toFixed(3);
      const evening = h >= 18 && h <= 22 ? 0.6 : 0;                                    // evening demand peak
      const consumed = meter.type === 'generation' ? 0 : +(0.2 + evening + Math.random() * 0.3).toFixed(3);
      ops.push({ updateOne: {
        filter: { meter: meter._id, timestamp: new Date(day.getTime() + h * 3600000) },
        update: { $set: { generatedKwh: generated, consumedKwh: consumed, source: 'simulated' } },
        upsert: true } });
    }
    await Reading.bulkWrite(ops);
    res.status(201).json({ message: 'Simulated 24 hourly readings', date: day.toISOString().slice(0, 10), weather });
  } catch (e) { next(e); }
};

// 5. GET /meters/:id/readings?from=&to=&interval=hour|day
exports.getReadings = async (req, res, next) => {
  try {
    const meter = await getOwnMeter(req, res); if (!meter) return;
    const { from, to, interval = 'hour' } = req.query;
    const fmt = interval === 'day' ? '%Y-%m-%d' : '%Y-%m-%dT%H:00';
    const data = await Reading.aggregate([
      { $match: rangeMatch(meter._id, from, to) },
      { $group: { _id: { $dateToString: { format: fmt, date: '$timestamp' } },
                  generatedKwh: { $sum: '$generatedKwh' }, consumedKwh: { $sum: '$consumedKwh' } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, period: '$_id', generatedKwh: { $round: ['$generatedKwh', 3] }, consumedKwh: { $round: ['$consumedKwh', 3] } } }
    ]);
    res.json(data);
  } catch (e) { next(e); }
};

// 6. GET /meters/:id/surplus?from=&to=
exports.getSurplus = async (req, res, next) => {
  try {
    const meter = await getOwnMeter(req, res); if (!meter) return;
    const { from, to } = req.query;
    const [t] = await Reading.aggregate([{ $match: rangeMatch(meter._id, from, to) },
      { $group: { _id: null, gen: { $sum: '$generatedKwh' }, con: { $sum: '$consumedKwh' } } }]);
    const generated = t?.gen || 0, consumed = t?.con || 0;
    res.json({ generatedKwh: +generated.toFixed(3), consumedKwh: +consumed.toFixed(3),
               netKwh: +(generated - consumed).toFixed(3), sellableKwh: +Math.max(0, generated - consumed).toFixed(3) });
  } catch (e) { next(e); }
};
