FROM pytorch/pytorch:2.4.1-cuda12.4-cudnn9-runtime
WORKDIR /app

COPY requirements.txt .
RUN python -m pip install -r requirements.txt

# COPY ./encoders /app/encoders

# COPY warmup.py /app
# RUN python warmup.py

# TO-BE-REMOVED
# Installation of dependencies

COPY . /app

ENV FLASK_APP=app.py
ENV FLASK_ENV=development
ENV FLASK_RUN_PORT=1809
ENV FLASK_RUN_HOST=0.0.0.0

# RUN python warmup.py

EXPOSE 1809

CMD ["flask", "run"]
