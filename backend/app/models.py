from app import db, login
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from sqlalchemy import ForeignKeyConstraint

@login.user_loader
def load_user(id):
    return User.query.get(int(id))

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(120), index=True, unique=True)
    password_hash = db.Column(db.String(128))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return '<User {}>'.format(self.username)


# ===== Schema models for current climate metadata =====

class IndexTable(db.Model):
    __tablename__ = 'index_table'
    # composite primary key to match MySQL table design
    column_id = db.Column(db.Integer, primary_key=True)
    row_id    = db.Column(db.Integer, primary_key=True)
    new_LON   = db.Column(db.Float)
    new_LAT   = db.Column(db.Float)
    Elevation = db.Column(db.Float)

    def __repr__(self):
        return f"<IndexTable ({self.column_id},{self.row_id})>"

class HistoryData(db.Model):
    __tablename__ = 'history_data'
    id = db.Column(db.Integer, primary_key=True)
    column_id = db.Column(db.Integer, nullable=False)
    row_id    = db.Column(db.Integer, nullable=False)

    Year  = db.Column(db.SmallInteger)
    Month = db.Column(db.SmallInteger)

    Humidity = db.Column(db.Float)
    Solar = db.Column(db.Float)
    Temperature = db.Column(db.Float)
    Pressure = db.Column(db.Float)
    Wind = db.Column(db.Float)
    High_Temp = db.Column(db.Float)
    Low_Temp = db.Column(db.Float)
    Rain = db.Column(db.Float)
    Vegetation_Coverage = db.Column(db.Float)
    Water_Body_Coverage = db.Column(db.Float)
    Apparent_Temperature = db.Column(db.Float)
    Apparent_Temperature_High = db.Column(db.Float)
    Apparent_Temperature_Low = db.Column(db.Float)

    __table_args__ = (
        ForeignKeyConstraint([
            'column_id', 'row_id'
        ], [
            'index_table.column_id', 'index_table.row_id'
        ], onupdate='CASCADE', ondelete='RESTRICT'),
        db.Index('idx_history_data_ym', 'Year', 'Month'),
        db.Index('idx_history_data_col_row', 'column_id', 'row_id'),
    )

    index_ref = db.relationship('IndexTable', backref=db.backref('history_rows', lazy=True))

    def __repr__(self):
        return f"<HistoryData id={self.id} ({self.column_id},{self.row_id}) Y{self.Year}M{self.Month}>"

# ===== Model for NDVI_Temp (predictions with vegetation coverage) =====
class NDVITemp(db.Model):
    __tablename__ = 'NDVI_Temp'

    id = db.Column(db.Integer, primary_key=True)
    column_id = db.Column(db.Integer, nullable=False)
    row_id = db.Column(db.Integer, nullable=False)
    Vegetation_Coverage = db.Column(db.Float)

    Month = db.Column(db.SmallInteger)

    High_Temp_Predicted = db.Column(db.Float)
    Low_Temp_Predicted = db.Column(db.Float)
    Temperature_Predicted = db.Column(db.Float)
    Apparent_Temperature = db.Column(db.Float)
    Apparent_Temperature_High = db.Column(db.Float)
    Apparent_Temperature_Low = db.Column(db.Float)
    Humidity = db.Column(db.Float)
    Solar = db.Column(db.Float)
    Pressure = db.Column(db.Float)
    Wind = db.Column(db.Float)
    Elevation = db.Column(db.Float)
    Rain = db.Column(db.Float)
    
    Water_Body_Coverage = db.Column(db.Float)

    __table_args__ = (
        ForeignKeyConstraint(
            ['column_id', 'row_id'],
            ['index_table.column_id', 'index_table.row_id'],
            onupdate='CASCADE',
            ondelete='RESTRICT'
        ),
        db.Index('idx_ndvi_col_row', 'column_id', 'row_id'),
        db.Index('idx_ndvi_month', 'Month'),
    )

    index_ref = db.relationship('IndexTable', backref=db.backref('ndvi_rows', lazy=True))

    def __repr__(self):
        return f"<NDVITemp id={self.id} ({self.column_id},{self.row_id}) M{self.Month}>"